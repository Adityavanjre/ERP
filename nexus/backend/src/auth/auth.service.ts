import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { GoogleAuthService } from './google-auth.service';
import { LoginDto, RegisterDto, GoogleLoginDto, OnboardingDto, CreateWorkspaceDto } from './dto/auth.dto';
import { TenantType, PlanType, Role, Prisma, AuthProvider } from '@prisma/client';
import { TenantContextService } from '../prisma/tenant-context.service';
import { AccountingService } from '../accounting/accounting.service';
import { LoggingService } from '../common/services/logging.service';
import { MailService } from '../system/services/mail.service';
import * as crypto from 'crypto';

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

        // Telemetry (Phase 4)
        await this.logging.log({
          userId: user.id,
          action: 'USER_REGISTERED',
          resource: 'User',
          details: { email: dto.email, tenant: dto.tenantName },
        });

        return user;
      });

      // Identity response (Rule A)
      return this.generateAuthResponse(newUser!);
    } catch (err: any) {
      throw new Error(`Registration Failed: ${err.message}`);
    }
  }

  async login(dto: LoginDto) {
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
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.logging.log({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'Identity',
      details: { method: 'Email', memberships: user.memberships.length },
    });

    return this.generateAuthResponse(user);
  }

  async googleLogin(dto: GoogleLoginDto) {
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

    const finalUser = user!;

    await this.logging.log({
      userId: finalUser.id,
      action: 'USER_LOGIN',
      resource: 'Identity',
      details: { method: 'Google', isNewUser: isNewUser },
    });

    return this.generateAuthResponse(finalUser);
  }

  private generateAuthResponse(user: any) {
    // Generate an "Identity Token" (No tenantId scope yet)
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'identity',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
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

  async selectTenant(userId: string, tenantId: string) {
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

    // 3. Generate Scoped Token
    const payload = {
      sub: userId,
      email: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email,
      tenantId: membership.tenantId,
      role: membership.role,
      customerId: customer?.id || null,
      supplierId: supplier?.id || null,
      type: 'tenant_scoped',
      isOnboarded: membership.tenant.isOnboarded, // Crucial for OnboardingGuard
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
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true }
    });

    if (!user || user.memberships.length === 0) {
      // Security: Don't reveal if user exists or is inactive
      return { message: 'If an account exists with this email, a reset link has been sent.' };
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

    return { message: 'If an account exists with this email, a reset link has been sent.' };
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
}
