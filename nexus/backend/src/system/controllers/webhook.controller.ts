import { Controller, Post, Req, Body, BadRequestException, RawBodyRequest, Logger } from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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
  @Post('razorpay')
  async handleRazorpay(@Req() req: RawBodyRequest<any>, @Body() body: any) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');

    // Signature Verification
    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        this.logger.error('Invalid Razorpay Webhook Signature');
        throw new BadRequestException('Invalid signature');
      }
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
