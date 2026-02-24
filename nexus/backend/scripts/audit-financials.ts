import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SystemAuditService } from '../src/system/services/system-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const auditService = app.get(SystemAuditService);
    const prisma = app.get(PrismaService);

    console.log('--- Starting Financial Integrity Audit ---');

    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
    });

    let hasErrors = false;

    for (const tenant of tenants) {
        console.log(`Auditing Tenant: ${tenant.name} (${tenant.id})...`);
        const report = await auditService.verifyFinancialIntegrity(tenant.id);

        if (report.integrity.trialBalance.status === 'Corrupted') {
            console.error(`[CRITICAL] Trial Balance Mismatch in ${tenant.name}: Drift = ${report.integrity.trialBalance.drift}`);
            hasErrors = true;
        }
    }

    if (hasErrors) {
        console.error('--- Audit Failed: Financial Integrity Violations Detected ---');
        process.exit(1);
    } else {
        console.log('--- Audit Passed: All Tenants Balanced ---');
        process.exit(0);
    }
}

bootstrap();
