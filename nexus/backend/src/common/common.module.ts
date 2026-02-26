import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TraceService } from './services/trace.service';

import { HttpCacheInterceptor } from './interceptors/cache.interceptor';
import { SecurityStorageService } from './services/security-storage.service';

@Global()
@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    HttpCacheInterceptor,
    TraceService,
    SecurityStorageService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [HttpCacheInterceptor, TraceService, SecurityStorageService],
})
export class CommonModule { }
