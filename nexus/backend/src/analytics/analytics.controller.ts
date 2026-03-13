import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  getSummary(@Req() req: any) {
    return this.analyticsService.getExecutiveSummary(req.user.tenantId);
  }

  @Get('overview')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  getOverview(@Req() req: any) {
    return this.analyticsService.getDashboardOverview(req.user.tenantId);
  }

  @Get('performance')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  getPerformance(@Req() req: any) {
    return this.analyticsService.getMonthlyPerformance(req.user.tenantId);
  }

  @Get('health')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  getHealth(@Req() req: any) {
    return this.analyticsService.getHealthMetrics(req.user.tenantId);
  }

  @Get('activity')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  getActivity(@Req() req: any) {
    return this.analyticsService.getActivityFeed(req.user.tenantId);
  }

  @Get('value-chain')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  getValueChain(@Req() req: any) {
    return this.analyticsService.getValueChain(req.user.tenantId);
  }
}
