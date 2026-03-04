import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaasAnalyticsService } from '../services/saas-analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('system/health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private saas: SaasAnalyticsService,
  ) {}

  // ... (existing check, getSaasPulse methods) ...

  @Get('forecast')
  @Roles(Role.Owner)
  @UseGuards(JwtAuthGuard)
  async getForecast(@Req() req: any) {
    return this.saas.getCashflowProjections(req.user.tenantId);
  }
}
