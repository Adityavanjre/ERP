import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { HttpCacheInterceptor } from './interceptors/cache.interceptor';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    HttpCacheInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [HttpCacheInterceptor],
})
export class CommonModule {}
