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

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private saas: SaasAnalyticsService,
  ) {}

  @Get('readiness')
  @Public() // DevOps probe
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), // 512MB Limit
    ]);
  }

  @Get('liveness')
  @Public() // DevOps probe
  checkLiveness() {
    return {
      status: 'up',
      version: '1.0.0-ZENITH',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('pulse')
  @Roles(Role.Owner)
  async getSaasPulse(@Req() req: any) {
    return this.saas.getClientHealthScore(req.user.tenantId);
  }

  @Get('forecast')
  @Roles(Role.Owner)
  async getForecast(@Req() req: any) {
    return this.saas.getCashflowProjections(req.user.tenantId);
  }

  @Get('infra')
  @Roles(Role.Owner)
  @HealthCheck()
  checkInfra() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Check if we have at least some free disk space (Windows safe path logic)
      () =>
        this.disk.checkStorage('disk', { path: 'C:', thresholdPercent: 0.99 }),
    ]);
  }
}
