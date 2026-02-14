import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaasAnalyticsService } from './services/saas-analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('kernel')
export class KernelController {
  constructor(
    private readonly saas: SaasAnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  async getKernelStats(@Req() req: any) {
    const [apps, installed, records] = await Promise.all([
      this.prisma.app.count(),
      this.prisma.app.count({ where: { installed: true } }),
      this.prisma.record.count({ where: { tenantId: req.user.tenantId } }),
    ]);

    return {
      apps,
      installed,
      records,
      uptime: '99.9%',
    };
  }

  @Get('founder-dashboard')
  getFounderDashboard() {
    // Note: In real production, this would be restricted to SUPER_ADMIN role
    return this.saas.getFounderDashboard();
  }
}
