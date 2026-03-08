import { Global, Module } from '@nestjs/common';
import { LoggingService } from '../common/services/logging.service';
import { QueueModule } from './queue/queue.module';
import { BulkImportProcessor } from './queue/bulk-import.processor';
import { YearCloseProcessor } from './queue/year-close.processor';
import { WebhookDlqProcessor } from './queue/webhook-dlq.processor';

/**
 * ARCH-001: Infrastructure Module
 *
 * Houses cross-cutting concerns: logging, BullMQ queue registration, and processors.
 * The @Global decorator makes QueueModule's exported BullModule queues
 * injectable across the entire application.
 */
@Global()
@Module({
  imports: [QueueModule],
  providers: [
    LoggingService,
    BulkImportProcessor,
    YearCloseProcessor,
    WebhookDlqProcessor,
  ],
  exports: [LoggingService, QueueModule],
})
export class InfrastructureModule {}
