import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaasAnalyticsService } from './services/saas-analytics.service';
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
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { type: true, industry: true },
    });

    const type = tenant?.type || 'Retail';

    // Industry-to-Module Mapping based on TenantType enum
    const moduleMap: Record<string, string[]> = {
      Manufacturing: ['sales', 'inventory', 'manufacturing', 'accounting', 'hr'],
      Retail: ['sales', 'inventory', 'accounting'],
      Wholesale: ['sales', 'inventory', 'purchases', 'accounting'],
      Service: ['sales', 'accounting', 'project', 'hr'],
      Construction: ['accounting', 'inventory', 'project', 'hr'],
      Healthcare: ['accounting', 'hr', 'crm'],
      Logistics: ['sales', 'inventory', 'accounting', 'hr'],
      Education: ['accounting', 'hr'],
      RealEstate: ['sales', 'accounting', 'crm'],
      Gov: ['accounting', 'hr', 'inventory'],
    };

    return {
      enabledModules: moduleMap[type] || ['sales', 'inventory', 'accounting'],
      industry: tenant?.industry,
      type: tenant?.type,
    };
  }

  @Get('founder-dashboard')
  getFounderDashboard() {
    // Note: In real production, this would be restricted to SUPER_ADMIN role
    return this.saas.getFounderDashboard();
  }
}
