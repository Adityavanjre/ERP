import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { GoogleAuthService } from './google-auth.service';
import { LoginDto, RegisterDto, GoogleLoginDto, OnboardingDto, CreateWorkspaceDto } from './dto/auth.dto';
import { TenantType, PlanType, Role, Prisma, AuthProvider, SubscriptionStatus } from '@prisma/client';
import { AccessChannel } from '@nexus/shared';
import { TenantContextService } from '../prisma/tenant-context.service';
import { AccountingService } from '../accounting/accounting.service';
import { LoggingService } from '../common/services/logging.service';
import { MailService } from '../system/services/mail.service';
import * as crypto from 'crypto';
import { AnomalyAlertService } from '../common/services/anomaly-alert.service';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { MfaCryptoService } from './mfa-crypto.service';
import { validateGSTIN } from '../common/utils/gst-validation.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private readonly accountingService: AccountingService,
    private readonly tenantContext: TenantContextService,
    private readonly mailService: MailService,
    private readonly googleAuth: GoogleAuthService,
    private readonly logging: LoggingService,
    private readonly anomalyAlert: AnomalyAlertService,
    private readonly mfaCrypto: MfaCryptoService,
  ) { }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const sanitizedName = dto.name.trim();
    const slug = sanitizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug || slug.length < 3) {
      throw new BadRequestException('Workspace name must contain at least 3 alphanumeric characters');
    }
    let finalSlug = slug;
    // OPS-004: Use exact match check rather than startsWith count.
    // startsWith('acme') matches both 'acme' and 'acme-corp', producing wrong counts
    // and potentially duplicate slugs under concurrent creation.
    const exactSlugExists = await this.prisma.tenant.findUnique({ where: { slug } });
    if (exactSlugExists) {
      finalSlug = `${slug}-${require('crypto').randomBytes(2).toString('hex')}`;
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: finalSlug,
        type: (dto.type as TenantType) ?? TenantType.Retail,
        plan: PlanType.Free,
        isOnboarded: false,
      },
    });

    await this.prisma.tenantUser.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: Role.Owner,
      },
    });

    await this.logging.log({
      userId: user.id,
      tenantId: tenant.id,
      action: 'WORKSPACE_CREATED',
      resource: 'Tenant',
      details: { name: dto.name },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      role: Role.Owner,
      isOnboarded: false,
    };
  }

  async register(dto: RegisterDto) {
    // 1. Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('This email address is already in use.');
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    try {
      // 3. Create User, Tenant, Membership and Init accounts in one atomic Transaction
      const newUser = await this.prisma.$transaction(async (tx: any) => {
        // Create User
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            authProvider: AuthProvider.Email,
            tokenVersion: 1, // FIX-AUTH-01: Always initialize to 1 to prevent null vs 1 mismatch on refresh
          },
        });

        // Create Tenant (Company)
        const sanitizedName = dto.tenantName.trim();
        const slug = sanitizedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') // Strictly alphanumeric
          .replace(/^-+|-+$/g, ''); // Trim hyphens

        if (!slug || slug.length < 3) {
          throw new BadRequestException('Company name must contain at least 3 alphanumeric characters');
        }

        // OPS-004: Exact slug lookup instead of startsWith count — prevents
        // non-unique slugs when concurrent registrations share the same base slug.
        let finalSlug = slug;
        const exactSlugExists = await tx.tenant.findFirst({ where: { slug } });
        if (exactSlugExists) {
          finalSlug = `${slug}-${require('crypto').randomBytes(2).toString('hex')}`;
        }

        const tenant = await tx.tenant.create({
          data: {
            name: dto.tenantName,
            slug: finalSlug,
            type: (dto.companyType as TenantType) ?? TenantType.Retail,
            plan: PlanType.Free,
            subscriptionStatus: SubscriptionStatus.Active, // Explicitly Active
            isOnboarded: false,
          },
        });

        // Create Membership (Owner)
        await tx.tenantUser.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: Role.Owner,
          },
        });

        // 4. Initialize Industry-Specific Accounts (Rule: Real money from day 1)
        await this.accountingService.initializeTenantAccounts(
          tenant.id,
          tx,
          tenant.type as string,
        );

        // Telemetry (Phase 4)
        try {
          await this.logging.log({
            userId: user.id,
            action: 'USER_REGISTERED',
            resource: 'User',
            details: { email: dto.email, tenant: dto.tenantName, industry: tenant.type },
          });
        } catch (logErr) {
          console.error('[AUTH_REGISTER_WARN] Telemetry logging failed, continuing anyway:', logErr);
        }

        return user;
      }, {
        maxWait: 5000, // default is 2000
        timeout: 20000, // default is 5000
      });

      // Re-fetch user with memberships so generateAuthResponse can map tenants correctly.
      // tx.user.create() does not return relation data even when a TenantUser was created
      // inside the same transaction, so we must query it after the transaction commits.
      const userWithMemberships = await this.prisma.user.findUnique({
        where: { id: newUser!.id },
        include: { memberships: { include: { tenant: true } } },
      });

      // Identity response — pass 'WEB' channel so the token matches what login/web produces.
      // Without this the default is 'MOBILE' and the user would hit mobile-only restrictions.
      return this.generateAuthResponse(userWithMemberships!, false, 'WEB');
    } catch (err: any) {
      console.error('[AUTH_REGISTER_ERROR]', err);
      throw err;
    }
  }

  async login(dto: LoginDto, channel: AccessChannel, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.authProvider !== AuthProvider.Email) {
      throw new UnauthorizedException(`This account uses ${user.authProvider} login. Please sign in using your social provider.`);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // SEC-007: Brute-force check runs BEFORE password evaluation.
    // A locked account must return the lockout error regardless of whether
    // the supplied password is correct — otherwise an attacker learns the
    // password is valid by observing the distinct lockout vs. invalid-credentials response.
    await this.checkBruteForce(user);

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.recordLoginFailure(user);
      await this.logging.log({
        userId: user.id,
        action: 'USER_LOGIN_FAILURE',
        resource: 'Identity',
        details: { method: 'Email', reason: 'Invalid Password' },
        ipAddress,
      });
      // Anomaly detection: check for brute-force burst from same IP
      if (ipAddress) {
        // Non-blocking: anomaly check must not defer the error response
        this.anomalyAlert.checkAuthFailureBurst(ipAddress).catch((anomalyErr) => {
          // Non-blocking: anomaly check must not defer the error response.
          // Logged so anomaly service failures are visible in ops.
          console.error('[AUTH_ANOMALY_WARN] Anomaly burst check failed silently:', anomalyErr);
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.resetLoginAttempts(user.id);

    // MFA Enforcement — only if user has explicitly enabled MFA
    const userAny = user as any;
    const rolesRequiringMfa: Role[] = [Role.Owner, Role.CA];
    const hasSensitiveRole = user.memberships.some((m: any) => rolesRequiringMfa.includes(m.role));

    if (userAny.mfaEnabled) {
      return {
        requiresMfa: true,
        tempToken: this.jwtService.sign({ sub: user.id, type: 'mfa_challenge', channel }),
        user: { id: user.id, email: user.email }
      };
    }

    await this.logging.log({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      resource: 'Identity',
      details: { method: 'Email', memberships: user.memberships.length, role: hasSensitiveRole ? 'Administrative' : 'Standard', channel },
      ipAddress,
    });

    return this.generateAuthResponse(user, false, channel);
  }

  async adminLogin(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isSuperAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash ?? '');
    if (!isPasswordValid) {
      await this.recordLoginFailure(user);
      await this.logging.log({
        userId: user.id,
        action: 'ADMIN_LOGIN_FAILURE',
        resource: 'Identity',
        details: { reason: 'Invalid Password' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.resetLoginAttempts(user.id);

    // Mandate MFA for Admin Login
    if (user.mfaEnabled) {
      return {
        requiresMfa: true,
        tempToken: this.jwtService.sign({ sub: user.id, type: 'mfa_challenge', isAdminFlow: true }),
        user: { id: user.id, email: user.email }
      };
    }

    await this.logging.log({
      userId: user.id,
      action: 'ADMIN_LOGIN_SUCCESS',
      resource: 'Identity',
      ipAddress,
    });

    return this.generateAuthResponse(user, false, 'WEB', true);
  }

  async googleLogin(dto: GoogleLoginDto, channel: AccessChannel) {
    const googleUser = await this.googleAuth.verifyIdToken(dto.idToken);

    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    const isNewUser = !user;

    if (user) {
      // Identity Safety Check (Rule E)
      if (user.authProvider === AuthProvider.Email) {
        throw new ConflictException('An account already exists with this email using password login. Please log in with your password and link Google in settings.');
      }
      if (user.providerId !== googleUser.providerId) {
        // Handle edge case of changing provider ID (rare but possible if Google sub changes)
        await this.prisma.user.update({
          where: { id: user.id },
          data: { providerId: googleUser.providerId },
        });
      }
    } else {
      // Create new Google User (Rule C: No tenant created yet, must onboard)
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email!,
          fullName: googleUser.fullName,
          avatarUrl: googleUser.avatarUrl,
          authProvider: AuthProvider.Google,
          providerId: googleUser.providerId,
        },
        include: { memberships: { include: { tenant: true } } },
      }) as any;
    }

    const finalUser = user! as any;

    // MFA Enforcement for Google Login
    const rolesRequiringMfa: Role[] = [Role.Owner, Role.CA];
    const hasSensitiveRole = (finalUser.memberships || []).some((m: any) => rolesRequiringMfa.includes(m.role));

    if (finalUser.mfaEnabled || hasSensitiveRole) {
      if (!finalUser.mfaEnabled) {
        // SECURITY: This token may ONLY be used for POST /auth/mfa/verify-setup.
        // It has a 10-minute expiry and the type 'mfa_setup_pending'.
        // ModuleGuard/RolesGuard must reject this token on all other endpoints.
        return {
          requiresMfaSetup: true,
          setupToken: this.jwtService.sign(
            { sub: finalUser.id, type: 'mfa_setup_pending' },
            { expiresIn: '10m' },
          ),
          user: { id: finalUser.id, email: finalUser.email },
        };
      }
      return {
        requiresMfa: true,
        tempToken: this.jwtService.sign(
          { sub: finalUser.id, type: 'mfa_challenge' },
          { expiresIn: '10m' },
        ),
        user: { id: finalUser.id, email: finalUser.email },
      };
    }

    await this.logging.log({
      userId: finalUser.id,
      action: 'USER_LOGIN',
      resource: 'Identity',
      details: { method: 'Google', isNewUser: isNewUser, channel },
    });

    return this.generateAuthResponse(finalUser, false, channel);
  }

  private generateAuthResponse(user: any, isMfaVerifiedOverride?: boolean, channel: AccessChannel = 'MOBILE', isAdminFlow: boolean = false) {
    // Generate an "Identity Token" (No tenantId scope yet)
    const userAny = user as any;
    const payload = {
      sub: user.id,
      email: user.email,
      jti: crypto.randomBytes(16).toString('hex'),
      tokenVersion: userAny.tokenVersion ?? 1,
      isMfaVerified: isMfaVerifiedOverride ?? !!userAny.isMfaVerified,
      mfaEnabled: !!userAny.mfaEnabled,
      isSuperAdmin: !!user.isSuperAdmin,
      type: user.isSuperAdmin && isAdminFlow && (isMfaVerifiedOverride ?? !!userAny.isMfaVerified) ? 'admin' : 'identity',
      channel: channel ?? 'MOBILE',
    };



    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh_token',
        originalType: payload.type,
        tokenVersion: payload.tokenVersion,
        isMfaVerified: payload.isMfaVerified,
        channel: payload.channel
      },
      { expiresIn: '7d' }
    );

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        mfaEnabled: !!userAny.mfaEnabled,
        isSuperAdmin: !!user.isSuperAdmin,
      },
      tenants: user.memberships.map((m: any) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
        isOnboarded: m.tenant.isOnboarded,
      })),
      requiresOnboarding: user.memberships.length === 0,
    };
  }

  async selectTenant(userId: string, tenantId: string, isMfaVerified: boolean = false, channel: AccessChannel = 'MOBILE') {
    // 1. Verify membership (Rule B)
    const membership = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { tenant: true },
    });

    if (!membership) {
      throw new UnauthorizedException('You do not have access to this tenant.');
    }

    // 1.1 Enforcement (TEN-003): Block access if workspace is suspended
    if (membership.tenant.subscriptionStatus === SubscriptionStatus.Suspended) {
      throw new GoneException(
        'This workspace has been suspended due to billing or compliance issues. Please contact support.',
      );
    }

    // 2. B2B Context (Keep existing logic)
    const [customer, supplier] = await this.tenantContext.run(tenantId, userId, membership.role, async () => {
      return Promise.all([
        this.prisma.customer.findFirst({ where: { userId, isDeleted: false, tenantId } }),
        this.prisma.supplier.findFirst({ where: { userId, isDeleted: false, tenantId } }),
      ]);
    });

    const userRecord = await this.prisma.user.findUnique({ where: { id: userId } });

    // 3. Generate Scoped Token
    const payload = {
      sub: userId,
      email: userRecord?.email,
      tenantId: membership.tenantId,
      role: membership.role,
      jti: crypto.randomBytes(16).toString('hex'),
      tokenVersion: userRecord?.tokenVersion ?? 1,
      mfaEnabled: (userRecord as any)?.mfaEnabled ?? false,
      customerId: customer?.id ?? null,
      supplierId: supplier?.id ?? null,
      type: 'tenant_scoped',
      isOnboarded: membership.tenant.isOnboarded,
      industry: membership.tenant.industry,
      tenantType: membership.tenant.type,
      isMfaVerified: isMfaVerified ?? false,
      isSuperAdmin: !!userRecord?.isSuperAdmin,
      channel: channel ?? 'MOBILE',
    };

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh_token',
        originalType: payload.type,
        tenantId: payload.tenantId,
        tokenVersion: payload.tokenVersion,
        isMfaVerified: payload.isMfaVerified,
        channel: payload.channel
      },
      { expiresIn: '7d' }
    );

    await this.logging.log({
      userId,
      tenantId: membership.tenantId,
      action: 'TENANT_SELECTED',
      resource: 'Tenant',
      details: { role: membership.role },
    });

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        role: membership.role,
        isOnboarded: membership.tenant.isOnboarded,
      },
    };
  }

  async refreshSession(refreshTokenStr: string) {
    if (!refreshTokenStr) throw new UnauthorizedException('Refresh token is required');

    let decoded: any;
    try {
      decoded = this.jwtService.verify(refreshTokenStr);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh_token') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { memberships: { include: { tenant: true } } }
    });

    // FIX-AUTH-01: Use same null-coalesce fallback (|| 1) as generateAuthResponse so newly
    // created users whose tokenVersion was null in DB never get a spurious session invalidation
    // on their very first token refresh. This is the root cause of the "Session expired" redirect
    // loop that appears immediately after the 24h access token expires.
    if (!user || (user.tokenVersion ?? 1) !== (decoded.tokenVersion ?? 1)) {
      throw new UnauthorizedException('Session invalidated due to password reset or remote logout.');
    }

    if (decoded.originalType === 'tenant_scoped') {
      return this.selectTenant(decoded.sub, decoded.tenantId, decoded.isMfaVerified, decoded.channel);
    } else {
      return this.generateAuthResponse(user, decoded.isMfaVerified, decoded.channel, decoded.originalType === 'admin');
    }
  }

  async onboarding(userId: string, dto: OnboardingDto) {
    // 1. Verify Ownership (Rule D)
    const membership = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId: dto.tenantId } },
    });

    if (!membership || membership.role !== Role.Owner) {
      throw new ForbiddenException('Only the company owner can complete onboarding.');
    }

    const currentTenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (currentTenant?.isOnboarded) {
      throw new ForbiddenException('Compliance Violation: Industry vertical is locked after onboarding. Mid-flight mutation is forbidden to prevent accounting drift.');
    }

    // 2. Platform-Level GSTIN Uniqueness Guard (TEN-002)
    // Prevents duplicate business registrations or conflicting entity setups.
    if (dto.gstin) {
      if (!validateGSTIN(dto.gstin)) {
        throw new BadRequestException({
          message: `Compliance Error: The provided GSTIN '${dto.gstin}' is mathematically invalid (Checksum Mismatch). Please verify your registration certificate.`,
          code: 'INVALID_GSTIN_CHECKSUM'
        });
      }

      const gstinCollision = await this.prisma.tenant.findFirst({
        where: {
          gstin: dto.gstin,
          id: { not: dto.tenantId }, // Exclude current tenant
        },
      });

      if (gstinCollision) {
        throw new ForbiddenException({
          message: `Integrity Error: GSTIN '${dto.gstin}' is already registered with another business workspace (${gstinCollision.name}). Duplicate registrations are forbidden.`,
          code: 'GSTIN_ALREADY_EXISTS',
        });
      }
    }

    const transactionResult = await this.prisma.$transaction(async (tx: any) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: dto.tenantId },
        data: {
          industry: dto.industry,
          type: (dto.industry as any) ?? TenantType.Retail,
          businessType: dto.businessType,
          gstin: dto.gstin,
          isOnboarded: true,
        },
      });

      // 3. Initialize Infrastructure (Default Warehouse)
      await tx.warehouse.create({
        data: {
          tenantId: updatedTenant.id,
          name: 'Main Warehouse',
          location: 'Default Location'
        }
      });

      // 4. Initialize Industry-Based COA
      await this.accountingService.initializeTenantAccounts(updatedTenant.id, tx, dto.industry);

      return updatedTenant;
    });

    const tenant = transactionResult;

    await this.logging.log({
      userId,
      tenantId: dto.tenantId,
      action: 'ONBOARDING_COMPLETED',
      resource: 'Tenant',
      details: { industry: dto.industry, businessType: dto.businessType },
    });

    return { success: true, message: 'Onboarding completed successfully', tenant };
  }



  async getTenantSecurityLogs(userId: string, tenantId: string) {
    // 1. Verify Owner/Admin Role
    const membership = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership || (membership.role !== Role.Owner && membership.role !== Role.Manager)) {
      throw new ForbiddenException('Only Owners and Managers can access company security logs.');
    }

    // 2. Fetch and return logs
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async forgotPassword(email: string) {
    // SECURITY AR-1: Timing equalization to prevent email enumeration.
    // Without this, the response is fast when the email does not exist (no DB write, no email send)
    // and slow when it does (DB write + email send). An attacker can distinguish valid emails
    // by measuring response time. Both paths now wait a minimum of 250ms before returning.
    const MINIMUM_RESPONSE_TIME_MS = 250;
    const startTime = Date.now();

    const conditionalWait = async () => {
      const elapsed = Date.now() - startTime;
      const remaining = MINIMUM_RESPONSE_TIME_MS - elapsed;
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    };

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true }
    });

    const SAFE_RESPONSE = { message: 'If an account exists with this email, a reset link has been sent.' };

    if (!user || user.memberships.length === 0) {
      await conditionalWait();
      return SAFE_RESPONSE;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiry

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    await this.mailService.sendPasswordResetEmail(user.email, token, user.fullName ?? '');

    await conditionalWait();
    return SAFE_RESPONSE;
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        resetPasswordToken: token,
        resetPasswordExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token for this email');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        tokenVersion: { increment: 1 },
      },
    });

    return { success: true, message: 'Password reset successful' };
  }

  async logoutAll(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    await this.logging.log({
      userId,
      action: 'LOGOUT_ALL_SESSIONS',
      resource: 'User',
      details: { timestamp: new Date() },
    });

    return { success: true, message: 'All active sessions have been invalidated.' };
  }


  async getTenants(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user.memberships.map((m: any) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
      isOnboarded: m.tenant.isOnboarded,
    }));
  }

  // --- MFA (TOTP) Implementation ---

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user) throw new UnauthorizedException('User not found');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'NexusERP', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      // SEC-004: Encrypt TOTP secret before writing — never store plaintext
      data: { mfaSecret: this.mfaCrypto.encrypt(secret) } as any,
    });

    return {
      secret,
      qrCodeDataUrl,
    };
  }

  async verifyMfaSetup(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA setup not initiated');

    // SEC-004: Decrypt the stored secret before passing to otplib
    const decryptedSecret = this.mfaCrypto.decrypt(user.mfaSecret);
    const isValid = authenticator.verify({ token, secret: decryptedSecret });
    if (!isValid) throw new UnauthorizedException('Invalid MFA token');

    const recoveryCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
    const hashedRecoveryCodes = await Promise.all(recoveryCodes.map(code => bcrypt.hash(code, 10)));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaRecoveryCodes: hashedRecoveryCodes,
      } as any,
    });

    await this.logging.log({
      userId,
      action: 'MFA_ENABLED',
      resource: 'User',
      details: { method: 'TOTP' },
    });

    return { recoveryCodes };
  }

  async verifyMfaLogin(tempToken: string, totpCode: string) {
    try {
      const payload = this.jwtService.verify(tempToken) as any;
      if (payload.type !== 'mfa_challenge') throw new UnauthorizedException('Invalid challenge token');

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { memberships: { include: { tenant: true } } },
      }) as any;

      if (!user || !user.mfaSecret) throw new UnauthorizedException('MFA not configured');

      // SEC-004: Decrypt the stored secret before passing to otplib
      const decryptedSecret = this.mfaCrypto.decrypt(user.mfaSecret);
      const isValid = authenticator.verify({ token: totpCode, secret: decryptedSecret });

      if (!isValid) {
        let isRecovery = false;
        for (const hashed of (user.mfaRecoveryCodes || [])) {
          if (await bcrypt.compare(totpCode, hashed)) {
            isRecovery = true;
            await this.prisma.user.update({
              where: { id: user.id },
              data: {
                mfaRecoveryCodes: user.mfaRecoveryCodes.filter((c: string) => c !== hashed)
              } as any
            });
            break;
          }
        }

        if (!isRecovery) {
          await this.logging.log({
            userId: user.id,
            action: 'MFA_FAILED',
            resource: 'Identity',
            details: { reason: 'Invalid Token' },
          });
          throw new UnauthorizedException('Invalid MFA token');
        }
      }

      await this.logging.log({
        userId: user.id,
        action: 'MFA_VERIFIED',
        resource: 'Identity',
        details: { method: 'TOTP' },
      });

      await this.resetLoginAttempts(user.id);

      return this.generateAuthResponse(user, true, payload.channel, !!payload.isAdminFlow);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        // Already a typed NestJS exception (e.g. 'Invalid MFA token') — rethrow as-is
        // to preserve the original message without losing stack trace info.
        throw e;
      }
      // Unexpected error (e.g. crypto failure, DB error) — wrap with context.
      throw new UnauthorizedException((e as any)?.message || 'MFA Verification Failed');
    }
  }

  // --- Brute Force Protection ---

  private async checkBruteForce(user: any) {
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes.`);
    }
  }

  private async recordLoginFailure(user: any) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    let lockoutUntil = null;

    if (attempts >= 5) {
      lockoutUntil = new Date(Date.now() + 15 * 60000);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockoutUntil,
      } as any,
    });

    if (attempts >= 5) {
      throw new UnauthorizedException('Account locked due to too many failed attempts. Try again in 15 minutes.');
    }
  }

  private async resetLoginAttempts(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      } as any,
    });
  }
}
