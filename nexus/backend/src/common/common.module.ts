import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TraceService } from './services/trace.service';

import { HttpCacheInterceptor } from './interceptors/cache.interceptor';
import { SecurityStorageService } from './services/security-storage.service';
import { SystemInitService } from './services/system-init.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [
    HttpCacheInterceptor,
    TraceService,
    SecurityStorageService,
    SystemInitService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [HttpCacheInterceptor, TraceService, SecurityStorageService],
})
export class CommonModule {}
