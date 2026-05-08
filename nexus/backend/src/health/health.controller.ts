import { Controller, Get, Req } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { SaasAnalyticsService } from '../system/services/saas-analytics.service';
import { AuthenticatedRequest } from '../common/interfaces/request.interface';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private saas: SaasAnalyticsService,
  ) {}

  @Get('readiness')
  @Public()
  async checkReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
    } catch (e) {
      return {
        status: 'error',
        info: {},
        error: { database: { status: 'down', message: e.message } },
        details: {},
      };
    }
  }

  @Get('liveness')
  @Public()
  checkLiveness() {
    return {
      status: 'up',
      version: '1.1.0-KLYPSO',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('pulse')
  @Roles(Role.Owner)
  async getSaasPulse(@Req() req: AuthenticatedRequest) {
    return this.saas.getClientHealthScore(req.user.tenantId as string);
  }

  @Get('forecast')
  @Roles(Role.Owner)
  async getForecast(@Req() req: AuthenticatedRequest) {
    return this.saas.getCashflowProjections(req.user.tenantId as string);
  }

  @Get('infra')
  @Roles(Role.Owner)
  checkInfra() {
    return {
      status: 'up',
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }
}
