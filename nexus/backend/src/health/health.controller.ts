import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';

@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
  ) { }

  @Get('readiness')
  @Roles(Role.Owner)
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), // 512MB Limit
    ]);
  }

  @Get('liveness')
  @Roles(Role.Owner)
  checkLiveness() {
    return {
      status: 'up',
      version: '1.0.0-ZENITH',
      timestamp: new Date().toISOString(),
    };
  }
}
