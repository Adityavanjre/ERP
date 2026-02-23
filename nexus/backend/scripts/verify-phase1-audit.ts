import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, POStatus, InvoiceStatus } from '@prisma/client';
import { TallyService } from '../src/accounting/services/tally-export.service';
import { ManufacturingService } from '../src/manufacturing/manufacturing.service';
import { InvoiceService } from '../src/accounting/services/invoice.service';
import { LedgerService } from '../src/accounting/services/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { StandardAccounts } from '../src/accounting/constants/account-names';

const prisma = new PrismaClient();

async function main() {
    console.log('--- PHASE 1 HARDENING VERIFICATION ---');
    const tenantId = 'verif-phase1-tenant';

    // 0. Setup
    try {
        await prisma.stockMovement.deleteMany({ where: { tenantId } });
        await prisma.stockLocation.deleteMany({ where: { tenantId } });
        await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId } } });
        await prisma.invoice.deleteMany({ where: { tenantId } });
        await prisma.product.deleteMany({ where: { tenantId } });
        await prisma.customer.deleteMany({ where: { tenantId } });
        await prisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch (e) {}

    await prisma.tenant.create({
        data: { id: tenantId, name: 'Audit & Co <Safe>', slug: 'audit-safe', state: 'Maharashtra' }
    });
    console.log('1. Created Tenant');

    // TEST 1: XML ESCAPING
    const ledger = new LedgerService(prisma as any, { get: () => null } as any);
    const tallyService = new TallyService(prisma as any, ledger as any);
    const escaped = (tallyService as any).escapeXml('Rahul & Sons "Safe" <Tag>');
    if (escaped === 'Rahul &amp; Sons &quot;Safe&quot; &lt;Tag&gt;') {
        console.log('SUCCESS: XML Escaping works.');
    } else {
        console.error('FAIL: XML Escaping failed:', escaped);
    }

    // TEST 2: COMPLIANCE ENFORCEMENT
    const invoiceService = new InvoiceService(prisma as any, ledger as any);
    const accountingMock = { ledger } as any;
    const manufacturing = new ManufacturingService(prisma as any, accountingMock);

    const custNoState = await prisma.customer.create({
        data: { tenantId, firstName: 'NoState', lastName: 'User', phone: '1' } as any
    });
    const prodNoHsn = await prisma.product.create({
        data: { tenantId, name: 'NoHSN', sku: 'NHSN', price: 100, stock: 10 } as any
    });

    try {
        await invoiceService.createInvoice(tenantId, {
            customerId: custNoState.id,
            items: [{ productId: prodNoHsn.id, quantity: 1, price: 100 }]
        });
        console.error('FAIL: Invoice created without Customer State!');
    } catch (e) {
        console.log('SUCCESS: Blocked invoice without state:', e.message);
    }

    await prisma.customer.update({ where: { id: custNoState.id }, data: { state: 'Goa' } as any });

    try {
        await invoiceService.createInvoice(tenantId, {
            customerId: custNoState.id,
            items: [{ productId: prodNoHsn.id, quantity: 1, price: 100 }]
        });
        console.error('FAIL: Invoice created without Product HSN!');
    } catch (e) {
        console.log('SUCCESS: Blocked invoice without HSN:', e.message);
    }

    // TEST 3: MANUFACTURING STOCK CONSISTENCY
    const rm = await prisma.product.create({
        data: { tenantId, name: 'Raw Material', sku: 'RM-01', stock: 100, hsnCode: '1234' } as any
    });
    const fg = await prisma.product.create({
        data: { tenantId, name: 'Finished Good', sku: 'FG-01', stock: 0, hsnCode: '5678' } as any
    });

    await prisma.stockLocation.create({
        data: { tenantId, productId: rm.id, warehouseId: 'wh-1', quantity: 100, notes: null } as any
    });

    const bom = await (prisma as any).billOfMaterial.create({
        data: { 
            tenantId, 
            productId: fg.id, 
            name: 'BOM-01',
            quantity: 1,
            items: {
                create: [{ productId: rm.id, quantity: 2 }]
            }
        }
    });

    const wo = await (prisma as any).workOrder.create({
        data: {
            tenantId,
            bomId: bom.id,
            productId: fg.id,
            quantity: 1,
            orderNumber: 'WO-CHECK-01',
            status: 'Planned',
            warehouseId: 'wh-1'
        }
    });

    // Start WO -> Move to WIP
    await (manufacturing as any).startWorkOrder(tenantId, wo.id, 'wh-1', 'user-1');
    
    // Complete WO -> FG Receipt, RM Consumption
    await (manufacturing as any).completeWorkOrder(tenantId, wo.id, 'wh-1', 1, 0, 'user-1');

    const updatedRM = await prisma.product.findUnique({ where: { id: rm.id } });
    if (updatedRM && updatedRM.stock.toNumber() === 98) {
        console.log('SUCCESS: Product stock decremented accurately after WIP consumption.');
    } else {
        console.error('FAIL: Product stock mismatch! Expected 98, got', updatedRM?.stock.toNumber());
    }

    await prisma.$disconnect();
}

main().catch(console.error);
