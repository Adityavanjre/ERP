import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { TenantType, PlanType, Role, Prisma } from '@prisma/client';
import { TenantContextService } from '../prisma/tenant-context.service';
import { AccountingService } from '../accounting/accounting.service';
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
  ) {}

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
      // 3. Create User, Tenant, and Membership sequentially (Transaction Pooler friendly)
      // Note: We sacrificed atomicity for connectivity via Port 6543
      
      // Create User
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
        },
      });

      // Create Tenant (Company)
      const slug = dto.tenantName.toLowerCase().replace(/ /g, '-');
      // Minimal collision handling for slug
      let finalSlug = slug;
      const slugCount = await this.prisma.tenant.count({
        where: { slug: { startsWith: slug } },
      });
      if (slugCount > 0) {
        finalSlug = `${slug}-${slugCount + 1}`;
      }

      const tenant = await this.prisma.tenant.create({
        data: {
          name: dto.tenantName,
          slug: finalSlug,
          type: (dto.companyType as TenantType) || TenantType.Retail,
          plan: PlanType.Free,
        },
      });

      // Create Membership (Owner)
      await this.prisma.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: Role.Owner,
        },
      });

      // Initialize Default Chart of Accounts (Strict Mode: Survival requirement)
      // removed tenantContext.run wrapper as it's not strictly needed for this direct call
      // and we want to avoid any async context issues with the pooler
      await this.accountingService.initializeTenantAccounts(tenant.id);

      // Generate Token
      const payload = {
        sub: user.id,
        email: user.email,
        tenantId: tenant.id,
        role: Role.Owner,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      };
    } catch (error: any) {
      console.error('REGISTRATION_FAILURE: An error occurred during the registration process');
      console.error('Email:', dto.email);
      console.error('Error Details:', error.message || error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma Error Code:', error.code);
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          take: 1, // Default to first company for now
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has at least one tenant membership
    // In future, if multiple tenants, user selects one or gets a list
    const membership = user.memberships[0]; // Defaulting to first
    if (!membership) {
      throw new UnauthorizedException('User has no active tenant');
    }

    // 4. B2B Context: Check if user is a Customer or Supplier (Context-Aware)
    const [customer, supplier] = await this.tenantContext.run(membership.tenantId, async () => {
      return Promise.all([
        this.prisma.customer.findFirst({ where: { userId: user.id, isDeleted: false, tenantId: membership.tenantId } }),
        this.prisma.supplier.findFirst({ where: { userId: user.id, isDeleted: false, tenantId: membership.tenantId } }),
      ]);
    });

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: membership.tenantId,
      role: membership.role,
      customerId: customer?.id || null,
      supplierId: supplier?.id || null,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
    };
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
}

