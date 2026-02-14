import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.analyticsService.getExecutiveSummary(req.user.tenantId);
  }

  @Get('performance')
  getPerformance(@Req() req: any) {
    return this.analyticsService.getMonthlyPerformance(req.user.tenantId);
  }

  @Get('health')
  getHealth(@Req() req: any) {
    return this.analyticsService.getHealthMetrics(req.user.tenantId);
  }

  @Get('activity')
  getActivity(@Req() req: any) {
    return this.analyticsService.getActivityFeed(req.user.tenantId);
  }

  @Get('value-chain')
  getValueChain(@Req() req: any) {
    return this.analyticsService.getValueChain(req.user.tenantId);
  }
}
