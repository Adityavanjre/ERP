import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaService, // Just to check connectivity
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @Roles(Role.Owner)
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.db.$queryRaw`SELECT 1`
          .then(() => ({ database: { status: 'up' } }))
          .catch((e) => ({
            database: { status: 'down', message: e.message },
          })) as any,
      // Check if we have at least 500MB free disk space
      // () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }), // disabled for windows logic
      // Check memory usage (heap) does not exceed 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
