import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { AuthService } from '../src/auth/auth.service';
import { InvoiceService } from '../src/accounting/services/invoice.service';
import { ManufacturingService } from '../src/manufacturing/manufacturing.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
    console.log('--- BOOTSTRAPPING NESTJS CONTEXT ---');
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const auth = app.get(AuthService);
    const inventory = app.get(InventoryService);
    const invoice = app.get(InvoiceService);
    const manufacturing = app.get(ManufacturingService);

    console.log('--- STARTING VERTICAL HARDENING VERIFICATION ---');

    // Setup: Create a test user and tenant
    const email = `audit-hero-${Date.now()}@nexus.erp`;
    const user = await prisma.user.create({
        data: { email, fullName: 'Audit Hero' }
    });

    const tenantSlug = `test-hardening-${Date.now()}`;
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Verification Corp',
            slug: tenantSlug,
            industry: 'NBFC',
            isOnboarded: true,
            users: { create: { userId: user.id, role: 'Owner' } }
        },
    });

    try {
        console.log('1. Verifying Industry Immutability...');
        await auth.onboarding(user.id, { industry: 'Retail' } as any);
        console.error('FAIL: Allowed industry mutation after onboarding');
    } catch (e: any) {
        console.log('PASS: Industry mutation blocked:', e.message);
    }

    try {
        console.log('2. Verifying NBFC Inventory Invariant...');
        await inventory.createProduct(tenant.id, { name: 'Fake Product', sku: 'FAKE-1' } as any, 'SYSTEM');
        console.error('FAIL: Allowed product creation for NBFC');
    } catch (e: any) {
        console.log('PASS: NBFC product creation blocked:', e.message);
    }

    // Switch tenant to Construction for Project Invariant
    await prisma.tenant.update({ where: { id: tenant.id }, data: { industry: 'Construction' } });

    try {
        console.log('3. Verifying Construction Project Invariant...');
        await invoice.createInvoice(tenant.id, {
            items: [{ productId: 'non-existent', quantity: 1, unitPrice: 100 }],
            customerId: 'non-existent',
            dueDate: new Date().toISOString()
        } as any);
        console.error('FAIL: Allowed project-less invoice for Construction');
    } catch (e: any) {
        console.log('PASS: Construction project-less invoice blocked:', e.message);
    }

    // Switch tenant to Retail for Manufacturing Invariant
    await prisma.tenant.update({ where: { id: tenant.id }, data: { industry: 'Retail' } });

    try {
        console.log('4. Verifying Manufacturing BOM Import Invariant...');
        await manufacturing.importBoms(tenant.id, 'finishProductSku,ingredientSku,quantity,unit\nSKU1,SKU2,10,kg');
        console.error('FAIL: Allowed BOM import for Retail');
    } catch (e: any) {
        console.log('PASS: Retail BOM import blocked:', e.message);
    }

    console.log('--- CLEANUP ---');
    await prisma.tenantUser.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log('--- VERIFICATION COMPLETE ---');
    await app.close();
}

bootstrap().catch(err => {
    console.error('Bootstrap Error:', err);
    process.exit(1);
});
