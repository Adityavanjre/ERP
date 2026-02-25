import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../src/prisma/prisma.module';
import { SystemAuditService } from '../src/system/services/system-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

@Module({
    imports: [PrismaModule],
    providers: [SystemAuditService],
})
class MinimalAuditModule { }

async function bootstrap() {
    console.log('--- Starting Minimal Financial Integrity Audit ---');
    const app = await NestFactory.createApplicationContext(MinimalAuditModule);
    const auditService = app.get(SystemAuditService);
    const prisma = app.get(PrismaService);

    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
    });

    let hasErrors = false;

    for (const tenant of tenants) {
        console.log(`Auditing Tenant: ${tenant.name} (${tenant.id})...`);
        try {
            const report = await auditService.verifyFinancialIntegrity(tenant.id);
            console.log(`Status for ${tenant.name}: ${report.status}`);

            if (report.forensicReport.invariants.globalDrCr === 'FAILED') {
                console.error(`[CRITICAL] Trial Balance Mismatch in ${tenant.name}: Drift = ${report.forensicReport.financials.tbDrift}`);
                hasErrors = true;
            }
        } catch (err) {
            console.error(`Failed to audit ${tenant.name}:`, err.message);
            hasErrors = true;
        }
    }

    await app.close();

    if (hasErrors) {
        console.error('--- Audit Failed: Financial Integrity Violations Detected ---');
        process.exit(1);
    } else {
        console.log('--- Audit Passed: All Tenants Balanced ---');
        process.exit(0);
    }
}

bootstrap();
