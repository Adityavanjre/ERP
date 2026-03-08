import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_WEBHOOK_DLQ } from '../../infrastructure/queue/queue.module';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WebhookDlqJobData {
  /** The external webhook provider that failed (e.g., 'Razorpay', 'Resend') */
  provider: string;
  /** The event type that failed */
  event: string;
  /** Original payload that needs to be reprocessed */
  payload: any;
  /** Original attempt timestamp */
  originalTimestamp: string;
  /** Internal tenant ID if determinable */
  tenantId?: string;
  /** An internal callback URL to replay the event against */
  internalReplayUrl?: string;
}

/**
 * OPS-004: Webhook Dead Letter Queue Processor
 *
 * When a webhook event fails to process (e.g., Razorpay payment confirmation
 * during a momentary DB outage), the WebhookController places the event
 * into this DLQ instead of silently dropping it.
 *
 * The processor retries delivery with exponential backoff (configured in QueueModule:
 * 3 attempts, 5s base delay → 5s, 25s, 125s).
 *
 * After all retries are exhausted, BullMQ marks the job as 'failed' and keeps it
 * in the failed set (removeOnFail:500) for manual inspection via a Bull dashboard.
 */
@Processor(QUEUE_WEBHOOK_DLQ)
export class WebhookDlqProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDlqProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<WebhookDlqJobData>): Promise<any> {
    const {
      provider,
      event,
      payload,
      originalTimestamp,
      tenantId,
      internalReplayUrl,
    } = job.data;
    this.logger.warn(
      `[DLQ:${job.id}] Replaying failed webhook: provider=${provider}, event=${event}, attempt=${job.attemptsMade + 1}/3`,
    );

    // Log the attempt in the audit log
    if (tenantId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            tenantId,
            userId: 'SYSTEM',
            action: 'WEBHOOK_DLQ_REPLAY',
            resource: `Webhook:${provider}`,
            details: {
              event,
              jobId: job.id,
              attempt: job.attemptsMade + 1,
              originalTimestamp,
            } as any,
          },
        });
      } catch (auditErr: any) {
        // Audit failure should not block the replay
        this.logger.warn(
          `[DLQ:${job.id}] Failed to write audit log: ${auditErr.message}`,
        );
      }
    }

    // Replay mode: POST the original payload to an internal endpoint for reprocessing
    if (internalReplayUrl) {
      const internalSecret = this.config.get<string>(
        'INTERNAL_WEBHOOK_REPLAY_SECRET',
      );
      try {
        const response = await axios.post(internalReplayUrl, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-DLQ-Replay': 'true',
            'X-DLQ-Job-Id': String(job.id),
            'X-Internal-Secret': internalSecret || '',
          },
        });
        this.logger.log(
          `[DLQ:${job.id}] Replay succeeded: status=${response.status}`,
        );
        return { replayed: true, status: response.status };
      } catch (err: any) {
        const status = err.response?.status;
        this.logger.error(
          `[DLQ:${job.id}] Replay failed: status=${status}, message=${err.message}`,
        );
        // Throw to trigger BullMQ retry
        throw new Error(
          `Webhook replay failed with status ${status}: ${err.message}`,
        );
      }
    }

    // Fallback: log to a persistent dead-letter store for manual ops intervention
    this.logger.error(
      `[DLQ:${job.id}] No replay URL configured. Storing in persistent dead-letter store for manual review.`,
    );
    await (this.prisma as any).webhookDeadLetter
      .create({
        data: {
          provider,
          event,
          payload,
          tenantId,
          originalTimestamp: new Date(originalTimestamp),
          jobId: String(job.id),
          totalAttempts: job.attemptsMade + 1,
          resolvedAt: null,
        },
      })
      .catch((e: any) => {
        this.logger.error(
          `[DLQ:${job.id}] Failed to store in dead-letter table: ${e.message}`,
        );
      });

    // Don't throw — the payload is safely stored, no point retrying again
    return { stored: true, requiresManualIntervention: true };
  }
}
