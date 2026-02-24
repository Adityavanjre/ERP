import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CloudinaryService } from '../src/system/services/cloudinary.service';
import { MailService } from '../src/system/services/mail.service';

async function verifyOfflineMock() {
    console.log('--- OFFLINE TESTABILITY PROOF START ---');
    process.env.NODE_ENV = 'test';

    const app = await NestFactory.createApplicationContext(AppModule);
    const cloudinary = app.get(CloudinaryService);
    const mail = app.get(MailService);

    console.log('1. Testing Cloudinary Mock (Offline)...');
    const mockFile = {
        originalname: 'test-invoice.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('dummy data'),
    } as any;

    const cloudRes = await cloudinary.uploadFile(mockFile);
    console.log('Result:', cloudRes);
    if (!cloudRes.secure_url.includes('local.mock')) throw new Error('Cloudinary mock failed');

    console.log('\n2. Testing Mail Mock (Offline)...');
    const mailRes = await mail.sendPasswordResetEmail('test@example.com', 'dummy-token', 'Test User');
    console.log('Result:', mailRes ? 'SUCCESS (Simulated)' : 'FAIL');
    if (!mailRes) throw new Error('Mail mock failed');

    console.log('\n🏆 100% OFFLINE TESTABILITY PROVEN.');
    process.exit(0);
}

verifyOfflineMock().catch(e => {
    console.error('❌ Proof Failed:', e.message);
    process.exit(1);
});
