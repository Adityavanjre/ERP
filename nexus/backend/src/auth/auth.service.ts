import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { GoogleAuthService } from './google-auth.service';
import { LoginDto, RegisterDto, GoogleLoginDto, OnboardingDto, CreateWorkspaceDto } from './dto/auth.dto';
import { TenantType, PlanType, Role, Prisma, AuthProvider } from '@prisma/client';
import { AccessChannel } from '@nexus/shared';
import { TenantContextService } from '../prisma/tenant-context.service';
import { AccountingService } from '../accounting/accounting.service';
import { LoggingService } from '../common/services/logging.service';
import { MailService } from '../system/services/mail.service';
import * as crypto from 'crypto';
import { AnomalyAlertService } from '../common/services/anomaly-alert.service';
const { authenticator } = require('otplib');
import * as QRCode from 'qrcode';

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
  ) { }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const slug = dto.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    let finalSlug = slug;
    const slugCount = await this.prisma.tenant.count({
      where: { slug: { startsWith: slug } },
    });
    if (slugCount > 0) {
      finalSlug = `${slug}-${slugCount + 1}`;
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: finalSlug,
        type: (dto.type as TenantType) || TenantType.Retail,
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
      const newUser = await this.prisma.$transaction(async (tx) => {
        // Create User
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            authProvider: AuthProvider.Email,
          },
        });

        // Create Tenant (Company)
        const slug = dto.tenantName.toLowerCase().replace(/ /g, '-');
        // Minimal collision handling for slug
        let finalSlug = slug;
        const slugCount = await tx.tenant.count({
          where: { slug: { startsWith: slug } },
        });
        if (slugCount > 0) {
          finalSlug = `${slug}-${slugCount + 1}`;
        }

        const tenant = await tx.tenant.create({
          data: {
            name: dto.tenantName,
            slug: finalSlug,
            type: (dto.companyType as TenantType) || TenantType.Retail,
            plan: PlanType.Free,
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
        await this.logging.log({
          userId: user.id,
          action: 'USER_REGISTERED',
          resource: 'User',
          details: { email: dto.email, tenant: dto.tenantName, industry: tenant.type },
        });

        return user;
      });

      // Identity response (Rule A)
      return this.generateAuthResponse(newUser!);
    } catch (err: any) {
      throw new Error(`Registration Failed: ${err.message}`);
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

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    await this.checkBruteForce(user);

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
        this.anomalyAlert.checkAuthFailureBurst(ipAddress).catch(() => { /* never block login flow */ });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.resetLoginAttempts(user.id);

    // MFA Enforcement
    const userAny = user as any;
    const rolesRequiringMfa: Role[] = [Role.Owner, Role.CA];
    const hasSensitiveRole = user.memberships.some((m: any) => rolesRequiringMfa.includes(m.role));

    if (userAny.mfaEnabled || (hasSensitiveRole && user.authProvider === AuthProvider.Email)) {
      if (!userAny.mfaEnabled) {
        return {
          requiresMfaSetup: true,
          setupToken: this.jwtService.sign({ sub: user.id, type: 'mfa_setup', channel }),
          user: { id: user.id, email: user.email }
        };
      }

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

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash || '');
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
      isMfaVerified: isMfaVerifiedOverride !== undefined ? isMfaVerifiedOverride : !!userAny.isMfaVerified,
      mfaEnabled: !!userAny.mfaEnabled,
      isSuperAdmin: !!user.isSuperAdmin,
      type: user.isSuperAdmin && isAdminFlow && (isMfaVerifiedOverride || !!userAny.isMfaVerified) ? 'admin' : 'identity',
      channel: channel || 'MOBILE',
    };



    return {
      accessToken: this.jwtService.sign(payload),
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

    // 2. B2B Context (Keep existing logic)
    const [customer, supplier] = await this.tenantContext.run(tenantId, async () => {
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
      mfaEnabled: (userRecord as any)?.mfaEnabled || false,
      customerId: customer?.id || null,
      supplierId: supplier?.id || null,
      type: 'tenant_scoped',
      isOnboarded: membership.tenant.isOnboarded,
      industry: membership.tenant.industry,
      tenantType: membership.tenant.type,
      isMfaVerified: isMfaVerified || false,
      isSuperAdmin: !!userRecord?.isSuperAdmin,
      channel: channel || 'MOBILE',
    };



    await this.logging.log({
      userId,
      tenantId: membership.tenantId,
      action: 'TENANT_SELECTED',
      resource: 'Tenant',
      details: { role: membership.role },
    });

    return {
      accessToken: this.jwtService.sign(payload),
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        role: membership.role,
        isOnboarded: membership.tenant.isOnboarded,
      },
    };
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

    // 2. Update Tenant Info (Rule C)
    const tenant = await this.prisma.tenant.update({
      where: { id: dto.tenantId },
      data: {
        industry: dto.industry,
        type: (dto.industry as any) || TenantType.Retail,
        businessType: dto.businessType,
        gstin: dto.gstin,
        isOnboarded: true,
      },
    });

    // 3. Initialize Infrastructure (Default Warehouse)
    await this.prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: 'Main Warehouse',
        location: 'Default Location'
      }
    });

    // 4. Initialize Industry-Based COA
    await this.accountingService.initializeTenantAccounts(tenant.id, null, dto.industry);

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

    await this.mailService.sendPasswordResetEmail(user.email, token, user.fullName || '');

    await conditionalWait();
    return SAFE_RESPONSE;
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { success: true, message: 'Password reset successful' };
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
      data: { mfaSecret: secret } as any,
    });

    return {
      secret,
      qrCodeDataUrl,
    };
  }

  async verifyMfaSetup(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA setup not initiated');

    const isValid = authenticator.verify({ token, secret: user.mfaSecret });
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

      const isValid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });

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
      if (e instanceof UnauthorizedException && e.message === 'Invalid MFA token') {
        // Already logged above
        throw e;
      }

      // For other errors (like invalid temp token), we might not have a userId yet
      // but if we do, log it
      throw new UnauthorizedException(e.message || 'MFA Verification Failed');
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
