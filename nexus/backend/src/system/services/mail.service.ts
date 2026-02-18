import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('SMTP Transport Initialized');
    } else {
      this.logger.warn('SMTP Credentials missing. Emails will be logged to console only.');
      // Mock transporter for dev/headless
      this.transporter = {
        sendMail: async (options: any) => {
          this.logger.debug(`[MOCK MAIL] To: ${options.to} | Subject: ${options.subject}`);
          this.logger.debug(`[MOCK MAIL] Content: ${options.text || options.html}`);
          return { messageId: 'mock-id' };
        },
      } as any;
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

    try {
      await this.transporter.sendMail({
        from: `"Klypso Nexus" <${this.config.get<string>('SMTP_FROM') || 'noreply@klypso.io'}>`,
        to,
        subject: 'Reset Your Password | Klypso Nexus',
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      return false;
    }
  }
}
