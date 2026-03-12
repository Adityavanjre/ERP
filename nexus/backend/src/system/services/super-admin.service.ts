import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all tenants with owner info, user counts, plan, status.
   */
  async listAllTenants(query?: {
    plan?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {};

    if (query?.plan) {
      where.plan = query.plan;
    }
    if (query?.status) {
      where.subscriptionStatus = query.status;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        industry: true,
        type: true,
        subscriptionStatus: true,
        createdAt: true,
        planExpiresAt: true,
        suspendReason: true,
        suspendedAt: true,
        state: true,
        gstin: true,
        _count: {
          select: { users: true },
        },
        users: {
          where: { role: 'Owner' },
          take: 1,
          select: {
            role: true,
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((t) => ({
      ...t,
      userCount: t._count.users,
      owner: t.users[0]?.user || null,
    }));
  }

  /**
   * Get a single tenant with full detail.
   */
  async getTenantDetail(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                createdAt: true,
                mfaEnabled: true,
                authProvider: true,
                isSuperAdmin: true,
                failedLoginAttempts: true,
                lockoutUntil: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Update a tenant's subscription plan.
   */
  async updateTenantPlan(tenantId: string, plan: string) {
    const validPlans = ['Free', 'Starter', 'Growth', 'Business', 'Enterprise'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException(
        `Invalid plan: ${plan}. Valid plans: ${validPlans.join(', ')}`,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: plan as any },
    });
  }

  /**
   * Update tenant subscription status (Active, GracePeriod, ReadOnly, Suspended).
   */
  async updateTenantStatus(tenantId: string, status: string, reason?: string) {
    const validStatuses = ['Active', 'GracePeriod', 'ReadOnly', 'Suspended'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const data: any = {
      subscriptionStatus: status as any,
    };

    if (status === 'Suspended') {
      data.suspendReason = reason || 'Suspended by Super Admin';
      data.suspendedAt = new Date();
    } else if (status === 'Active') {
      data.suspendReason = null;
      data.suspendedAt = null;
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  /**
   * Update a user's profile (fullName, email).
   */
  async updateUserProfile(
    userId: string,
    data: { fullName?: string; email?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newEmail =
      typeof data.email === 'string'
        ? data.email.trim().toLowerCase()
        : undefined;
    const newFullName =
      typeof data.fullName === 'string' ? data.fullName.trim() : undefined;

    if (newEmail === '') {
      throw new BadRequestException('Email cannot be empty');
    }

    if (newEmail && newEmail !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: newEmail },
      });
      if (existing) {
        throw new BadRequestException('Email already in use by another user');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: newFullName ?? user.fullName,
        email: newEmail ?? user.email,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  /**
   * Reset a user's password (Super Admin override).
   */
  async resetUserPassword(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSuperAdmin) {
      throw new ForbiddenException(
        'Cannot reset another Super Admin password from this panel',
      );
    }

    const rawPassword = require('crypto').randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    return { temporaryPassword: rawPassword };
  }

  /**
   * Block or unblock a user account (preserves data).
   */
  async toggleUserBlock(userId: string, block: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSuperAdmin) {
      throw new ForbiddenException('Cannot block a Super Admin account');
    }

    if (block) {
      // Check if user is the only Owner in any active tenant
      for (const membership of user.memberships) {
        if (membership.role === 'Owner') {
          const ownerCount = await this.prisma.tenantUser.count({
            where: { tenantId: membership.tenantId, role: 'Owner' },
          });
          if (ownerCount <= 1) {
            throw new ForbiddenException(
              `Cannot block: user is the only Owner of tenant ${membership.tenantId}.`,
            );
          }
        }
      }

      // Block for 100 years
      const lockoutDate = new Date();
      lockoutDate.setFullYear(lockoutDate.getFullYear() + 100);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockoutUntil: lockoutDate,
          tokenVersion: { increment: 1 }, // Invalidate current sessions
        },
      });
      return { blocked: true };
    } else {
      // Unblock
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockoutUntil: null,
          failedLoginAttempts: 0,
        },
      });
      return { blocked: false };
    }
  }

  /**
   * Get plan statistics.
   */
  async getPlanStats() {
    const tenants = await this.prisma.tenant.findMany({
      select: {
        plan: true,
        subscriptionStatus: true,
      },
    });

    const planCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const t of tenants) {
      planCounts[t.plan] = (planCounts[t.plan] || 0) + 1;
      statusCounts[t.subscriptionStatus] =
        (statusCounts[t.subscriptionStatus] || 0) + 1;
    }

    return {
      total: tenants.length,
      byPlan: planCounts,
      byStatus: statusCounts,
    };
  }

  /**
   * Get all available modules.
   */
  getAllModules() {
    return [
      'accounting',
      'inventory',
      'manufacturing',
      'hr',
      'crm',
      'purchases',
      'sales',
      'healthcare',
      'nbfc',
      'logistics',
      'construction',
      'projects',
    ];
  }

  /**
   * Get the currently enabled modules for a tenant (from industry config + overrides).
   */
  async getTenantModules(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true, type: true, businessType: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const industry = tenant.industry || tenant.type || 'General';

    // Dynamic import to avoid circular dependency issues at the top of the file
    const { getIndustryConfig } =
      await import('../../common/constants/industry-config');
    const config = getIndustryConfig(industry);

    // Extract overridden modules from businessType field
    // Format: "originalType|module1,module2,module3"
    const extraModulesStr = (tenant.businessType || '').split('|')[1] || '';
    const extraModules = extraModulesStr ? extraModulesStr.split(',') : [];

    // Merge array uniquely
    const enabledModules = [
      ...new Set([...(config.enabledModules || []), ...extraModules]),
    ];

    return {
      industry,
      enabledModules,
      allModules: this.getAllModules(),
    };
  }

  /**
   * Override module access for a tenant by updating its industry-specific module list.
   * This stores extra modules in the tenant's `businessType` field as a JSON string.
   * The system config endpoint can then merge these overrides.
   */
  async updateTenantModules(tenantId: string, modules: string[]) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const allModules = this.getAllModules();
    const invalid = modules.filter((m) => !allModules.includes(m));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid modules: ${invalid.join(', ')}`);
    }

    // Store extra module overrides in the businessType field as JSON
    // Format: "originalType|module1,module2,module3"
    const extraModules = modules.join(',');
    const baseType = (tenant.businessType || '').split('|')[0] || '';
    const encoded = baseType
      ? `${baseType}|${extraModules}`
      : `|${extraModules}`;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { businessType: encoded },
    });

    return { tenantId, enabledModules: modules };
  }
}
