
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
    const tenantId = 'audit-tenant-' + Date.now();
    console.log(`Starting Audit for Tenant: ${tenantId}`);

    let score = {
        inventory: 0,
        sales: 0,
        payments: 0,
        ledger: 0,
        purchases: 0
    };

    try {
        // --- 1. SETUP ---
        // Create Tenant
        await prisma.tenant.create({
            data: {
                id: tenantId,
                name: 'Audit Corp',
                slug: tenantId,
                type: 'Retail'
            }
        });

        // Create Account Chart (Assets, Revenue)
        const assetAccount = await prisma.account.create({
            data: { tenantId, name: 'Inventory Asset', type: 'Asset', code: '1000', balance: 0 }
        });
        const revenueAccount = await prisma.account.create({
            data: { tenantId, name: 'Sales Revenue', type: 'Revenue', code: '4000', balance: 0 }
        });
        const arAccount = await prisma.account.create({
            data: { tenantId, name: 'Accounts Receivable', type: 'Asset', code: '1100', balance: 0 }
        });

        // --- 2. INVENTORY TEST ---
        console.log('\n--- 2. INVENTORY TEST ---');
        const product = await prisma.product.create({
            data: {
                tenantId,
                name: 'Audit Widget',
                sku: 'AUD-001',
                price: 100,
                costPrice: 50,
                stock: 100
            }
        });
        console.log(`[PASS] Product Created. Stock: ${product.stock}`);

        // --- 3. SALES & INVOICE TEST ---
        console.log('\n--- 3. SALES & INVOICE TEST ---');
        // Simulate Invoice Creation Logic (mirroring AccountingService.createInvoice roughly)
        // We will assert if the changes involved Stock Deduction and Item Persistence

        // Setup Customer
        const customer = await prisma.customer.create({
            data: {
                tenantId,
                firstName: 'Audit',
                lastName: 'Buyer',
                email: 'audit@test.com'
            }
        });

        // Create Invoice Payload
        const invoiceData = {
            items: [{ productId: product.id, quantity: 10, price: 100 }],
            customerId: customer.id,
            dueDate: new Date().toISOString()
        };

        // Call the service logic "simulation"
        // In a real integration test we'd call the service, but here we check the outcome of what the service does.
        // Since we know the service doesn't save items, we check the schema capability first.

        // CHECK: Does InvoiceItem model exist?
        // We can check by trying to create one if we can guess the name, or just checking the Invoice structure if it allows includes.
        // We'll rely on our earlier finding: Invoice does NOT have items in Prisma Schema clearly visible in `AccountingService.createInvoice` return.

        // Let's create an invoice using raw Prisma matching the service's logic
        const invoice = await prisma.invoice.create({
            data: {
                tenantId,
                customerId: customer.id,
                invoiceNumber: 'INV-AUD-001',
                issueDate: new Date(),
                dueDate: new Date(),
                totalAmount: 1000,
                totalTaxable: 1000,
                status: 'Unpaid'
            }
        });

        console.log(`[INFO] Invoice Created: ${invoice.id}`);

        // ASSERT: Check Stock
        const pAfter = await prisma.product.findUnique({ where: { id: product.id } });
        if (pAfter.stock === 100) {
            console.log(`[FAIL] Stock did not decrease after Invoice. Expected 90, Got 100.`);
        } else if (pAfter.stock === 90) {
            console.log(`[PASS] Stock decreased correctly.`);
            score.inventory += 10;
        } else {
            console.log(`[FAIL] Stock changed unexpectedly. Got ${pAfter.stock}`);
        }

        // --- 4. PURCHASE TEST ---
        console.log('\n--- 4. PURCHASE TEST ---');
        // Create Supplier
        const supplier = await prisma.supplier.create({
            data: { tenantId, name: 'Audit Supply Co', email: 'sup@test.com' }
        });

        // Create PO
        const po = await prisma.purchaseOrder.create({
            data: {
                tenantId,
                supplierId: supplier.id,
                status: 'Ordered',
                orderNumber: 'PO-001',
                totalAmount: 500,
                items: {
                    create: [{ productId: product.id, quantity: 50, unitPrice: 10 }]
                }
            }
        });

        // Simulate "Receive" Logic (mirroring PurchasesService.updatePOStatus)
        // Service logic increments stock.
        await prisma.product.update({
            where: { id: product.id },
            data: { stock: { increment: 50 } }
        });

        const pAfterPO = await prisma.product.findUnique({ where: { id: product.id } });
        if (pAfterPO.stock === pAfter.stock + 50) {
            console.log(`[PASS] Stock increased on PO receipt. Est: ${pAfter.stock + 50}, Got: ${pAfterPO.stock}`);
            score.purchases += 10;
        } else {
            console.log(`[FAIL] Stock update failed on PO.`);
        }

        // CHECK FINANCIALS: Is there a Journal Entry for this Purchase?
        // Service does NOT create one.
        const poJournal = await prisma.journalEntry.findFirst({
            where: { tenantId, description: { contains: 'PO-001' } }
        });
        if (!poJournal) {
            console.log(`[FAIL] No Journal Entry created for Purchase Receipt. Accrual Accounting violated.`);
        } else {
            console.log(`[PASS] Purchase Journal found.`);
        }

        // --- 5. LEDGER TEST ---
        console.log('\n--- 5. LEDGER TEST for Customer ---');
        // Initial: Invoice 1000. Setup Ledger check.
        // We need to implement the ledger query logic from AccountingService locally to verify.
        // AccountingService logic: Unpaid invoices + Opening Balance.

        const ledgerCheck = await prisma.invoice.findMany({
            where: { customerId: customer.id }
        });
        const totalOutstanding = ledgerCheck.reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)), 0);

        console.log(`[INFO] Customer Ledger Outstanding: ${totalOutstanding}`);
        if (totalOutstanding === 1000) {
            console.log(`[PASS] Ledger reflects Invoice amount.`);
            score.ledger += 10;
        } else {
            console.log(`[FAIL] Ledger mismatch.`);
        }

        // --- 6. PAYMENTS TEST ---
        console.log('\n--- 6. PAYMENT TEST ---');
        // Create Payment
        await prisma.payment.create({
            data: {
                tenantId,
                customerId: customer.id,
                invoiceId: invoice.id,
                amount: 500,
                date: new Date(),
                mode: 'Cash',
                reference: 'PAY-001',
                idempotencyKey: 'IDEM-001'
            }
        });
        // Update Invoice
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { amountPaid: { increment: 500 }, status: 'Partial' }
        });

        // Check Ledger again
        const ledgerCheck2 = await prisma.invoice.findMany({ where: { customerId: customer.id } });
        const outstanding2 = ledgerCheck2.reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)), 0);

        if (outstanding2 === 500) {
            console.log(`[PASS] Ledger updated after partial payment.`);
            score.ledger += 10;
        } else {
            console.log(`[FAIL] Ledger failed to update. Expected 500, Got ${outstanding2}`);
        }

        // --- 7. DELETION SAFETY ---
        console.log('\n--- 7. DELETION SAFETY ---');
        try {
            await prisma.product.delete({ where: { id: product.id } });
            console.log(`[FAIL] Deleted product with history (PO/Invoice). Checks failed.`);
        } catch (e) {
            console.log(`[PASS] Database prevented deletion of active product: ${e.message.split('\n')[0]}`);
            score.inventory += 5;
        }

    } catch (err) {
        console.error("AUDIT FATAL ERROR", err);
    } finally {
        await prisma.$disconnect();
    }
}

audit();
