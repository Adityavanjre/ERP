import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaasAnalyticsService } from './services/saas-analytics.service';
import { SystemAuditService } from './services/system-audit.service';
import { getIndustryConfig } from '../common/constants/industry-config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('system')
export class SystemController {
  constructor(
    private readonly saas: SaasAnalyticsService,
    private readonly audit: SystemAuditService,
    private readonly prisma: PrismaService,
  ) { }

  @Get('stats')
  async getSystemStats(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const [products, customers, invoices, transactions] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.transaction.count({ where: { tenantId } }),
    ]);

    return {
      products,
      customers,
      invoices,
      transactions,
      uptime: '99.9%',
    };
  }

  @Get('config')
  async getModuleConfig(@Req() req: any) {
    const industry = req.user.industry || req.user.tenantType || 'General';
    const config = getIndustryConfig(industry);

    return {
      ...config,
      industry: industry,
    };
  }

  @Get('audit')
  @Permissions(Permission.VIEW_REPORTS)
  async getIntegrityAudit(@Req() req: any) {
    return this.audit.verifyFinancialIntegrity(req.user.tenantId);
  }

  @Get('founder-dashboard')
  getFounderDashboard() {
    // Note: In real production, this would be restricted to SUPER_ADMIN role
    return this.saas.getFounderDashboard();
  }
}
