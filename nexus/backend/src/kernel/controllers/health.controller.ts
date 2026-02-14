import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaasAnalyticsService } from '../services/saas-analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('kernel/health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private saas: SaasAnalyticsService,
  ) {}

  // ... (existing check, getSaasPulse methods) ...

  @Get('forecast')
  @UseGuards(JwtAuthGuard)
  async getForecast(@Req() req: any) {
    return this.saas.getCashflowProjections(req.user.tenantId);
  }
}
