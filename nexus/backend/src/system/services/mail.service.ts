import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeFetch } from '../../common/utils/ssrf.util';

const RESEND_API_URL = 'https://api.resend.com/emails';
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) { }

  /**
   * Internal send with exponential backoff retry.
   * Retries up to MAX_RETRIES times on transient network or API failures.
   * Permanent failures (4xx) are not retried.
   */
  private async sendWithRetry(payload: object, attempt = 0): Promise<boolean> {
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');

    try {
      const response = await safeFetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return true;
      }

      const errorData = await response.json().catch(() => ({}));

      // Do not retry client errors (4xx) — they indicate a configuration issue
      if (response.status >= 400 && response.status < 500) {
        this.logger.error(`Resend API client error (${response.status}): ${JSON.stringify(errorData)}`);
        return false;
      }

      // Server error (5xx) or unexpected — retry if attempts remain
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 4000;
        this.logger.warn(`Resend API server error (${response.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(payload, attempt + 1);
      }

      this.logger.error(`Resend API failed after ${MAX_RETRIES} attempts: ${JSON.stringify(errorData)}`);
      return false;
    } catch (error: any) {
      // Network-level failure — retry if attempts remain
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 4000;
        this.logger.warn(`Resend network error. Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}): ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(payload, attempt + 1);
      }
      this.logger.error(`Resend permanently failed after ${MAX_RETRIES} attempts.`, error.stack);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, token: string, userName: string) {
    const resetUrl = `${this.config.get<string>('NEXUS_FRONTEND_URL')}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 8px;">
        <h2 style="color: #38bdf8;">Klypso Nexus Password Recovery</h2>
        <p>Hello ${userName || 'User'},</p>
        <p>You requested a password reset for your account. Click the button below to set a new password. This link expires in 1 hour.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #38bdf8; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 0.8em; color: #94a3b8;">If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 0.7em; color: #64748b;">Powered by Klypso Zenith Architecture</p>
      </div>
    `;

    const resendApiKey = this.config.get<string>('RESEND_API_KEY');

    if (!resendApiKey) {
      this.logger.warn(`No RESEND_API_KEY found. SIMULATING email to ${to}`);
      return true;
    }

    const success = await this.sendWithRetry({
      from: 'Klypso Nexus ERP <noreply@klypso.in>',
      to,
      subject: 'Reset Your Password | Klypso Nexus',
      html,
    });

    if (success) {
      this.logger.log(`Password reset email sent successfully to ${to}`);
    } else {
      this.logger.error(`Failed to deliver password reset email to ${to} after ${MAX_RETRIES} attempts.`);
    }

    return success;
  }
}
