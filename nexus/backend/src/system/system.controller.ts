import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { SaasAnalyticsService } from './services/saas-analytics.service';
import { SystemAuditService } from './services/system-audit.service';
import { getIndustryConfig } from '../common/constants/industry-config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { Module } from '../common/decorators/module.decorator';


import { AllowIdentity } from '../common/decorators/allow-identity.decorator';

@UseGuards(JwtAuthGuard,  PermissionsGuard)
@Module('system')
@Controller('system')
export class SystemController {
  constructor(
    private readonly saas: SaasAnalyticsService,
    private readonly audit: SystemAuditService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('stats')
  async getSystemStats(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const cacheKey = `nexus:system:stats:${tenantId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const [products, customers, invoices, transactions] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.transaction.count({ where: { tenantId } }),
    ]);

    const result = {
      products,
      customers,
      invoices,
      transactions,
      uptime: '99.9%',
    };

    await this.cacheManager.set(cacheKey, result, 300000); // 5 mins
    return result;
  }

  @Get('config')
  @AllowIdentity()
  // No explicit @Roles means all authenticated tenant users can fetch UI config
  async getModuleConfig(@Req() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return {
        ...getIndustryConfig('General'),
        enabledModules: [
          'dashboard',
          'sales',
          'inventory',
          'accounting',
          'crm',
        ],
        industry: 'General',
      };
    }

    const cacheKey = `nexus:system:config:${tenantId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    let industry = req.user.industry || req.user.tenantType || 'General';
    let businessType = '';

    // SYS-PERF: Only hit DB if industry is missing from token (legacy sessions)
    // or if we need businessType overrides.
    if (!req.user.industry || industry === 'General') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { industry: true, type: true, businessType: true },
      });
      industry = tenant?.industry || tenant?.type || 'General';
      businessType = tenant?.businessType || '';
    }

    const config = getIndustryConfig(industry);

    // Extract any Super Admin module overrides (Format: Role|Module1,Module2)
    const extraModulesStr = businessType.split('|')[1] || '';
    const extraModules = extraModulesStr ? extraModulesStr.split(',') : [];

    // Merge standard industry modules with overridden extra modules
    const mergedModules = [
      ...new Set([...(config.enabledModules || []), ...extraModules]),
    ];

    // Fetch currency from DB
    const tenantForCurrency = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true, enabledModules: true },
    });

    // Merge DB-saved modules with industry defaults
    const dbModules = tenantForCurrency?.enabledModules || [];
    const finalModules = dbModules.length > 0
      ? [...new Set([...dbModules, ...mergedModules])]
      : mergedModules;

    const result = {
      ...config,
      enabledModules: finalModules,
      industry: industry,
      currency: tenantForCurrency?.currency || 'INR',
    };

    await this.cacheManager.set(cacheKey, result, 3600000); // 1 hour
    return result;
  }

  @Patch('modules')
  async updateModules(
    @Req() req: any,
    @Body() body: { modules: string[] },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('No workspace context. Please select a workspace first.');
    }

    // Only Owner can update module configuration
    if (req.user.role !== 'Owner' && !req.user.isSuperAdmin) {
      throw new ForbiddenException('Only the workspace Owner can change module settings.');
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { enabledModules: body.modules },
    });

    // Invalidate the config cache so next GET returns fresh data
    await this.cacheManager.del(`nexus:system:config:${tenantId}`);

    return { success: true, enabledModules: body.modules };
  }

  @Patch('tenant-profile')
  async updateTenantProfile(
    @Req() req: any,
    @Body() body: {
      name?: string;
      logoUrl?: string;
      address?: string;
      state?: string;
      gstin?: string;
      panNumber?: string;
      phone?: string;
      email?: string;
      authorizedSignatory?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('No workspace context.');
    }

    const membership = await this.prisma.tenantUser.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.sub,
          tenantId,
        },
      },
    });

    const userRole = req.user.role as string;
    const isSuperAdmin = req.user.isSuperAdmin;

    if (!membership && !isSuperAdmin) {
      throw new ForbiddenException('Only a workspace administrator can update company details.');
    }

    if (!isSuperAdmin && userRole !== 'Owner' && userRole !== 'Admin' && userRole !== 'Manager') {
      throw new ForbiddenException('Only a workspace administrator can update company details.');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.gstin !== undefined && { gstin: body.gstin }),
        ...(body.panNumber !== undefined && { panNumber: body.panNumber }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.authorizedSignatory !== undefined && { authorizedSignatory: body.authorizedSignatory }),
      },
    });

    await this.cacheManager.del(`nexus:system:config:${tenantId}`);

    return { success: true, data: updated };
  }

  // ── Bank Accounts CRUD ──────────────────────────────────────────

  @Get('bank-accounts')
  async listBankAccounts(@Req() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenException('No workspace context.');

    const accounts = await this.prisma.bankAccount.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return { success: true, data: accounts };
  }

  @Post('bank-accounts')
  async createBankAccount(
    @Req() req: any,
    @Body() body: {
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      branch: string;
      accountHolderName: string;
      isDefault?: boolean;
    },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenException('No workspace context.');

    if (body.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await this.prisma.bankAccount.create({
      data: {
        tenantId,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        ifscCode: body.ifscCode,
        branch: body.branch,
        accountHolderName: body.accountHolderName,
        isDefault: body.isDefault ?? false,
      },
    });

    return { success: true, data: account };
  }

  @Patch('bank-accounts/:id')
  async updateBankAccount(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      branch?: string;
      accountHolderName?: string;
      isDefault?: boolean;
    },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenException('No workspace context.');

    if (body.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        ...(body.bankName !== undefined && { bankName: body.bankName }),
        ...(body.accountNumber !== undefined && { accountNumber: body.accountNumber }),
        ...(body.ifscCode !== undefined && { ifscCode: body.ifscCode }),
        ...(body.branch !== undefined && { branch: body.branch }),
        ...(body.accountHolderName !== undefined && { accountHolderName: body.accountHolderName }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    });

    return { success: true, data: account };
  }

  @Delete('bank-accounts/:id')
  async deleteBankAccount(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenException('No workspace context.');

    await this.prisma.bankAccount.deleteMany({ where: { id, tenantId } });

    return { success: true };
  }

  @Get('audit')
  @Permissions(Permission.VIEW_REPORTS)
  async getIntegrityAudit(@Req() req: any) {
    return this.audit.verifyFinancialIntegrity(req.user.tenantId);
  }

  @Get('audit/logs')
  @Permissions(Permission.VIEW_REPORTS)
  async getAuditLogs(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.audit.getAuditLogs(
      req.user.tenantId,
      Number(page) || 1,
      Number(limit) || 200,
    );
  }

  @Get('founder-dashboard')
  @AllowIdentity() // Allow global admin access without tenant context
  async getFounderDashboard(@Req() req: any) {
    if (!req.user.isSuperAdmin) {
      throw new ForbiddenException(
        'Management Oversight Restricted: This view is reserved for system administrators.',
      );
    }
    return this.saas.getFounderDashboard();
  }
}
