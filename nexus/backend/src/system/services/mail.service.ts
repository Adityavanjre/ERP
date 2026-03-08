import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeFetch } from '../../common/utils/ssrf.util';

const RESEND_API_URL = 'https://api.resend.com/emails';
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {}

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
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return true;
      }

      const errorData = await response.json().catch(() => ({}));

      // Do not retry client errors (4xx) — they indicate a configuration issue
      if (response.status >= 400 && response.status < 500) {
        const errorBody = await response.text().catch(() => 'No body');
        this.logger.error(
          `Resend API client error (${response.status}): ${errorBody}`,
        );
        return false;
      }

      // Server error (5xx) or unexpected — retry if attempts remain
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 4000;
        this.logger.warn(
          `Resend API server error (${response.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(payload, attempt + 1);
      }

      this.logger.error(
        `Resend API failed after ${MAX_RETRIES} attempts: ${JSON.stringify(errorData)}`,
      );
      return false;
    } catch (error: any) {
      // Network-level failure — retry if attempts remain
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 4000;
        this.logger.warn(
          `Resend network error. Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}): ${error.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(payload, attempt + 1);
      }
      this.logger.error(
        `Resend permanently failed after ${MAX_RETRIES} attempts: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, token: string, userName: string) {
    // BUG-FIX: Reset URL now includes the `email` query param.
    // POST /auth/reset-password requires BOTH `email` and `token` to look up the DB record.
    // Without email in the URL, the frontend cannot call the endpoint correctly —
    // the old URL only had the token, causing every reset attempt to fail with 401.
    const baseUrl = this.config.get<string>('NEXUS_FRONTEND_URL');
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;

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
      this.logger.error(
        `CRITICAL: RESEND_API_KEY is missing. Cannot send email to ${to}`,
      );
      throw new Error(
        'Email delivery failed due to missing configuration (RESEND_API_KEY).',
      );
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
      // BUG-FIX: Throw instead of silently returning false.
      // Previously AuthService continued as if the email was sent, giving the user false hope.
      this.logger.error(
        `Failed to deliver password reset email to ${to} after ${MAX_RETRIES} attempts.`,
      );
      throw new Error(
        `Email delivery failed after ${MAX_RETRIES} retries. ` +
          `Verify RESEND_API_KEY is set and that noreply@klypso.in is a verified Resend sender domain.`,
      );
    }

    return success;
  }

  /**
   * Generic internal email sender for system alerts and notifications.
   */
  async sendEmail(to: string, subject: string, html: string) {
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      this.logger.error(
        `CRITICAL: RESEND_API_KEY is missing. Cannot send alert to ${to}`,
      );
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Email delivery failed: RESEND_API_KEY is missing in production.',
        );
      }
      return false;
    }

    return this.sendWithRetry({
      from: 'Nexus System Alert <alerts@klypso.in>',
      to,
      subject,
      html,
    });
  }
}
