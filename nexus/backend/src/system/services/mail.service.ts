import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {}

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
      this.logger.warn(`No RESEND_API_KEY found. Mock sending email to ${to}`);
      return true; // Pretend it sent for testing
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Klypso Nexus ERP <noreply@klypso.in>',
          to: to,
          subject: 'Reset Your Password | Klypso Nexus',
          html: html
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`Resend API Error: ${JSON.stringify(errorData)}`);
        return false;
      }

      this.logger.log(`Password reset email sent successfully via Resend to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to} via Resend.`, error.stack);
      return false;
    }
  }
}
