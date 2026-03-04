import { Controller, Post, Req, Body, BadRequestException, RawBodyRequest, Logger, UseInterceptors } from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { Public } from '../../common/decorators/public.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_WEBHOOK_DLQ } from '../../infrastructure/queue/queue.module';
import { WebhookDlqJobData } from '../../infrastructure/queue/webhook-dlq.processor';

@Controller('system/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_WEBHOOK_DLQ) private readonly dlqQueue: Queue,
  ) { }

  /**
   * Razorpay Webhook Handler
   * SECURITY (SUB-002 / SEC-016): Verifies HMAC signature using official SDK to prevent spoofing.
   * OPS-004: Failed processing events are dispatched to the DLQ instead of being dropped.
   */
  // SEC-WEBHOOK-01: @Public() intentional — Razorpay is an external system with no tenant session.
  // Authentication is done via HMAC signature verification below.
  @Public()
  @Post('razorpay')
  @UseInterceptors(IdempotencyInterceptor)
  async handleRazorpay(@Req() req: RawBodyRequest<any>, @Body() body: any) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('CRITICAL: RAZORPAY_WEBHOOK_SECRET is missing. Webhook denied.');
      throw new BadRequestException('Webhook configuration error');
    }

    if (!signature) {
      throw new BadRequestException('Missing signature');
    }

    // BIL-WEBHOOK-001 / SEC-016: Hardened Signature Verification via official SDK
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(body));

    try {
      const isValid = Razorpay.validateWebhookSignature(
        rawBody.toString(),
        signature,
        webhookSecret
      );

      if (!isValid) {
        throw new Error('Invalid signature');
      }
    } catch (err) {
      this.logger.error('Invalid Razorpay Webhook Signature — possible spoofing attempt');
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event;
    const payload = body.payload;

    this.logger.log(`Received Razorpay Webhook: ${event}`);

    // OPS-004: Wrap the processing logic in a try/catch.
    // If processing fails (e.g., DB outage), dispatch to DLQ for automatic retry.
    try {
      if (event && event.startsWith('subscription.')) {
        const subId = payload.subscription.entity.id;
        const razorStatus = payload.subscription.entity.status;

        if (razorStatus === 'halted' || razorStatus === 'pending') {
          await this.billing.handleSubscriptionFailure(subId, 'Payment Failed / Halted');
        } else if (razorStatus === 'cancelled' || razorStatus === 'expired') {
          await this.billing.handleSubscriptionFailure(subId, 'Subscription Cancelled/Expired');
        } else if (razorStatus === 'active') {
          await this.billing.handleSubscriptionSuccess(subId);
        }
      }
    } catch (processingErr: any) {
      // OPS-004: Dispatch to Dead Letter Queue instead of silently failing
      this.logger.error(`Failed to process Razorpay event '${event}': ${processingErr.message}. Dispatching to DLQ.`);

      const dlqData: WebhookDlqJobData = {
        provider: 'Razorpay',
        event,
        payload: body,
        originalTimestamp: new Date().toISOString(),
        internalReplayUrl: `${this.config.get('INTERNAL_API_BASE_URL', 'http://localhost:3001')}/api/system/webhooks/razorpay/replay`,
      };

      await this.dlqQueue.add(
        `razorpay-dlq-${event}`,
        dlqData,
        {
          // First retry in 30s, then 2.5 min, then ~12 min
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
        }
      );
    }

    return { received: true };
  }
}
