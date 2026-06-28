import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';



import { Public } from '../common/decorators/public.decorator';
import { AllowIdentity } from '../common/decorators/allow-identity.decorator';

@UseGuards(JwtAuthGuard, )
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.analyticsService.getExecutiveSummary(req.user.tenantId);
  }

  @Get('overview')
  getOverview(@Req() req: any) {
    return this.analyticsService.getDashboardOverview(req.user.tenantId);
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

  @Get('diagnostics')
  @AllowIdentity() // Allow identifying why tenant context is failing
  async getDiagnostics(@Req() req: any) {
    return this.analyticsService.runDiagnostics(req.user.tenantId);
  }

  @Public()
  @Get('ping')
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '3.0.1',
    };
  }

  @Get('value-chain')
  getValueChain(@Req() req: any) {
    return this.analyticsService.getValueChain(req.user.tenantId);
  }
}
