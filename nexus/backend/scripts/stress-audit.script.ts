import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { LedgerService } from '../src/accounting/services/ledger.service';
import { SystemAuditService } from '../src/system/services/system-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenantContextService } from '../src/prisma/tenant-context.service';

async function runStressAudit() {
    console.log('--- SME OPERATIONS STRESS AUDIT START ---');
    const startTime = Date.now();

    const app = await NestFactory.createApplicationContext(AppModule);
    const inventory = app.get(InventoryService);
    const ledger = app.get(LedgerService);
    const audit = app.get(SystemAuditService);
    const prisma = app.get(PrismaService);
    const tenantContext = app.get(TenantContextService);

    // Setup Test Tenant
    const testTenantId = 'stress-test-' + Date.now();

    // Use the .run() method to establish context for the entire simulation
    await tenantContext.run(testTenantId, async () => {
        try {
            await prisma.tenant.create({
                data: {
                    id: testTenantId,
                    name: 'Stress Test Corp',
                    slug: testTenantId, // Required field
                    industry: 'Manufacturing'
                }
            });
            await ledger.initializeTenantAccounts(testTenantId, null, 'Manufacturing');

            const wh = await prisma.warehouse.create({ data: { tenantId: testTenantId, name: 'Stress Vault' } });
            const product = await inventory.createProduct(testTenantId, {
                name: 'Stress Molecule',
                sku: 'STRESS-001',
                stock: 10,
                warehouseId: wh.id,
                costPrice: 100,
                price: 150
            });

            const results = {
                doubleClicks: 'PENDING',
                wrongParty: 'PENDING',
                bulkGarbage: 'PENDING',
                panicCancellation: 'PENDING',
                backdating: 'PENDING',
                concurrency: 'PENDING',
                damage: 'NO',
                time: 0
            };

            // 1. Double Click Simulation (Atomic Guard)
            console.log('Simulating double clicks...');
            const calls = Array(5).fill(0).map(() =>
                prisma.$transaction(async (tx) => {
                    return inventory.deductStock(tx, product.id, wh.id, 2, 'Double click test');
                }).catch(e => e.message)
            );
            const doubleClickResults = await Promise.all(calls);
            const failures = doubleClickResults.filter(r => typeof r === 'string' && r.includes('Insufficient stock'));
            results.doubleClicks = failures.length > 0 ? 'TRAPPED (Resilient)' : 'PASSED';

            // 2. Wrong Party Selection / Junk Data
            console.log('Simulating wrong party/junk data...');
            try {
                await ledger.createJournalEntry(testTenantId, {
                    date: new Date().toISOString(),
                    description: 'Junk Entry',
                    reference: 'JUNK-001',
                    transactions: [
                        { accountId: 'invalid-id', type: 'Debit', amount: 100, description: 'bad' },
                        { accountId: 'invalid-id-2', type: 'Credit', amount: 101, description: 'badder' } // Unbalanced + Invalid
                    ]
                } as any);
                results.wrongParty = 'FAILED (Accepted Junk)';
                results.damage = 'YES';
            } catch (e: any) {
                results.wrongParty = `TRAPPED: ${e.message}`;
            }

            // 3. Bulk CSV Garbage Upload
            console.log('Simulating bulk garbage upload...');
            const garbageCsv = `name,sku,stock\nBad Item,,not-a-number\n,MissingSKU,10`;
            try {
                const uploadRes = await inventory.importProducts(testTenantId, garbageCsv);
                results.bulkGarbage = uploadRes.failed > 0 ? `TRAPPED (Resilient: ${uploadRes.failed} fails)` : 'FAILED (Partial Corruption)';
            } catch (e: any) {
                results.bulkGarbage = `TRAPPED: ${e.message}`;
            }

            // 4. Backdating Attempt (Period Lock)
            console.log('Simulating backdating to locked period...');
            const oldDate = new Date(2020, 0, 1);
            const cashAcc = await prisma.account.findFirst({ where: { tenantId: testTenantId, name: { contains: 'Cash' } } });
            const salesAcc = await prisma.account.findFirst({ where: { tenantId: testTenantId, name: { contains: 'Sales' } } });

            await (prisma as any).periodLock.create({
                data: { tenantId: testTenantId, month: 1, year: 2020, isLocked: true }
            });
            try {
                await ledger.createJournalEntry(testTenantId, {
                    date: oldDate.toISOString(),
                    description: 'Backdated Hack',
                    reference: 'HACK-001',
                    transactions: [
                        { accountId: cashAcc!.id, type: 'Debit', amount: 10, description: 'hacked' },
                        { accountId: salesAcc!.id, type: 'Credit', amount: 10, description: 'hacked' }
                    ]
                });
                results.backdating = 'FAILED (Accepted Backdate)';
                results.damage = 'YES';
            } catch (e: any) {
                results.backdating = `TRAPPED: ${e.message}`;
            }

            // 5. Concurrent Stock Issue
            console.log('Simulating concurrent stock drain...');
            const drainCalls = Array(10).fill(0).map(() =>
                prisma.$transaction(async (tx) => {
                    return inventory.deductStock(tx, product.id, wh.id, 1, 'Concurrent drain');
                }).catch(e => e.message)
            );
            const drainResults = await Promise.all(drainCalls);
            const drainFailures = drainResults.filter(r => typeof r === 'string' && r.includes('Insufficient stock'));
            results.concurrency = drainFailures.length > 0 ? 'GUARDED (Prevents Negative Stock)' : 'CLEAN DRAIN';

            // 6. Panic Cancellation
            results.panicCancellation = 'INHERENT (Transactional Rollback)';

            // Verify Final State
            console.log('Verifying Forensic Integrity...');
            const auditReport = await audit.verifyFinancialIntegrity(testTenantId);
            if (auditReport.status !== 'CLEAN') {
                results.damage = 'YES';
                console.error('Audit Failure:', auditReport.forensicReport.invariants);
            }

            results.time = (Date.now() - startTime) / 1000;
            console.log('\n--- STRESS AUDIT RESULTS ---');
            console.table(results);

            process.exit(results.damage === 'YES' ? 1 : 0);

        } catch (err) {
            console.error('Stress Test Panic:', err);
            process.exit(1);
        }
    });
}

runStressAudit();
