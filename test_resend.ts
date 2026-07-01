import { MailService } from './nexus/backend/src/system/services/mail.service';
import { ConfigService } from '@nestjs/config';

async function run() {
  const config = new ConfigService({ RESEND_API_KEY: process.env.RESEND_API_KEY });
  const mailService = new MailService(config);

  try {
    console.log('Sending test email...');
    const result = await mailService.sendEmail('test@example.com', 'Test Email', '<p>This is a test email.</p>');
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
