import {
  Controller,
  Get,
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
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { Module } from '../common/decorators/module.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AllowIdentity } from '../common/decorators/allow-identity.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Module('system')
@Controller('system')
export class SystemController {
  constructor(
    private readonly saas: SaasAnalyticsService,
    private readonly audit: SystemAuditService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  @Get('stats')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
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
  // No explicit @Roles means all authenticated tenant users can fetch UI config
  async getModuleConfig(@Req() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return {
        ...getIndustryConfig('General'),
        enabledModules: ['dashboard', 'sales', 'inventory', 'accounting', 'crm'],
        industry: 'General',
      };
    }

    const cacheKey = `nexus:system:config:${tenantId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    let industry = 'General';
    let businessType = '';

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true, type: true, businessType: true },
    });
    industry = tenant?.industry || tenant?.type || 'General';
    businessType = tenant?.businessType || '';

    const config = getIndustryConfig(industry);

    // Extract any Super Admin module overrides (Format: Role|Module1,Module2)
    const extraModulesStr = businessType.split('|')[1] || '';
    const extraModules = extraModulesStr ? extraModulesStr.split(',') : [];

    // Merge standard industry modules with overridden extra modules
    const mergedModules = [
      ...new Set([...(config.enabledModules || []), ...extraModules]),
    ];

    const result = {
      ...config,
      enabledModules: mergedModules,
      industry: industry,
    };

    await this.cacheManager.set(cacheKey, result, 3600000); // 1 hour
    return result;
  }

  @Get('audit')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  async getIntegrityAudit(@Req() req: any) {
    return this.audit.verifyFinancialIntegrity(req.user.tenantId);
  }

  @Get('audit/logs')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
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
  @Roles(Role.Owner)
  async getFounderDashboard(@Req() req: any) {
    if (!req.user.isSuperAdmin) {
      throw new ForbiddenException(
        'Management Oversight Restricted: This view is reserved for system administrators.',
      );
    }
    return this.saas.getFounderDashboard();
  }
}
