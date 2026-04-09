import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TraceService } from './services/trace.service';

import { SecurityStorageService } from './services/security-storage.service';
import { SystemInitService } from './services/system-init.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [
    TraceService,
    SecurityStorageService,
    SystemInitService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [TraceService, SecurityStorageService],
})
export class CommonModule {}
