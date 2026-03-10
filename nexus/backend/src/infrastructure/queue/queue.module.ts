import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * ARCH-001: Central BullMQ Queue Module
 *
 * Registers long-running job queues to prevent Event Loop blocking.
 * All heavy synchronous operations (Year Closing, Tally Export, Bulk Import)
 * are offloaded to these queues.
 */
export const QUEUE_BULK_IMPORT = 'bulk-import';
export const QUEUE_YEAR_CLOSE = 'year-close';
export const QUEUE_TALLY_EXPORT = 'tally-export';
export const QUEUE_WEBHOOK_DLQ = 'webhook-dlq';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          // ARCH-001: Resilience for build/audit/bootstrap environments without live Redis
          lazyConnect: true,
          retryStrategy: () => null, // Disables retries to prevent blocking audit
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_BULK_IMPORT },
      { name: QUEUE_YEAR_CLOSE },
      { name: QUEUE_TALLY_EXPORT },
      { name: QUEUE_WEBHOOK_DLQ },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule { }
