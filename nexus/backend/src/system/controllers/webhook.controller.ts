import { Controller, Post, Req, Body, BadRequestException, RawBodyRequest, Logger, UseInterceptors } from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { Public } from '../../common/decorators/public.decorator';

@Controller('system/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly config: ConfigService,
  ) { }

  /**
   * Razorpay Webhook Handler
   * SECURITY (SUB-002): Verifies HMAC signature to prevent spoofing.
   */
  // SEC-WEBHOOK-01: @Public() is intentional — Razorpay is an external system with no
  // tenant session token. Authentication is done via HMAC signature verification below.
  // Without @Public(), RolesGuard (global) would reject this with 403 before the handler runs.
  @Public()
  @Post('razorpay')
  @UseInterceptors(IdempotencyInterceptor)
  async handleRazorpay(@Req() req: RawBodyRequest<any>, @Body() body: any) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    // BIL-WEBHOOK-001: Hardened Signature Verification
    // Use rawBody for verification to avoid JSON serialization mismatches
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(body));

    if (!webhookSecret) {
      this.logger.error('CRITICAL: RAZORPAY_WEBHOOK_SECRET is missing in environment. Denying all webhooks.');
      throw new BadRequestException('Webhook configuration error');
    }

    if (!signature) {
      this.logger.warn('Razorpay Webhook rejected: missing x-razorpay-signature header');
      throw new BadRequestException('Missing signature');
    }

    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');

    // Use a fixed-time comparison to prevent side-channel attacks.
    // Length check ensures we don't throw; timingSafeEqual only works on same-length buffers.
    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature);

    if (digestBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
      this.logger.error('Invalid Razorpay Webhook Signature detected — possible spoofing attempt');
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event;
    const payload = body.payload;

    this.logger.log(`Received Razorpay Webhook: ${event}`);

    // Handle Subscription Lifecycle
    if (event && event.startsWith('subscription.')) {
      const subId = payload.subscription.entity.id;
      const razorStatus = payload.subscription.entity.status;

      // Map Razorpay status to Nexus status
      // active, authenticated, created, expired, halted, pending, paused, cancelled
      if (razorStatus === 'halted' || razorStatus === 'pending') {
        await this.billing.handleSubscriptionFailure(subId, 'Payment Failed / Halted');
      } else if (razorStatus === 'cancelled' || razorStatus === 'expired') {
        await this.billing.handleSubscriptionFailure(subId, 'Subscription Cancelled/Expired');
      } else if (razorStatus === 'active') {
        await this.billing.handleSubscriptionSuccess(subId);
      }
    }

    return { received: true };
  }
}
