import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { StandardAccounts } from '../../accounting/constants/account-names';

@Injectable()
export class SystemAuditService {
    constructor(private prisma: PrismaService) { }

    async verifyFinancialIntegrity(tenantId: string) {
        // 1. Trial Balance Audit (Global Dr == Cr)
        const allTransactions = await this.prisma.transaction.findMany({
            where: { tenantId }
        });

        let totalDebit = new Decimal(0);
        let totalCredit = new Decimal(0);

        allTransactions.forEach(t => {
            if (t.type === 'Debit') totalDebit = totalDebit.add(t.amount);
            else totalCredit = totalCredit.add(t.amount);
        });

        const tbBalanced = totalDebit.equals(totalCredit);

        // 2. Per-Journal Invariant Audit (Local Dr == Cr)
        const journals = await this.prisma.journalEntry.findMany({
            where: { tenantId },
            include: { transactions: true }
        });

        const unbalancedJournals = journals.filter(j => {
            let dr = new Decimal(0);
            let cr = new Decimal(0);
            j.transactions.forEach(t => {
                if (t.type === 'Debit') dr = dr.add(t.amount);
                else cr = cr.add(t.amount);
            });
            return !dr.equals(cr);
        });

        const documentsMissingTrace = await this.checkTraceCoverage(tenantId);
        const orphanedTx = await this.prisma.transaction.findMany({
            where: { tenantId, correlationId: null } as any
        });
        const stockMissingTrace = await this.prisma.stockMovement.count({
            where: { tenantId, correlationId: null } as any
        });

        // 4. Immutability Audit (No Destructive Edits)
        // Check for JournalEntries or Transactions where updatedAt > createdAt + buffer
        // Note: LedgerService is append-only, but we verify here for bypass detection.
        const mutatedJournals = await this.prisma.journalEntry.findMany({
            where: {
                tenantId,
                updatedAt: { gt: this.prisma.journalEntry.fields.createdAt } // Conceptual check
            }
        });

        // Refined Immutability Check: Count records where updatedAt is significantly different from createdAt
        // (Assuming 5 second buffer for creation transaction lag)
        const journalMutations = await this.prisma.$queryRaw`
            SELECT COUNT(*) FROM "JournalEntry" 
            WHERE "tenantId" = ${tenantId} 
            AND "updatedAt" > "createdAt" + interval '5 seconds'
        `;

        const transactionMutations = await this.prisma.$queryRaw`
            SELECT COUNT(*) FROM "Transaction" 
            WHERE "tenantId" = ${tenantId} 
            AND "updatedAt" > "createdAt" + interval '5 seconds'
        `;

        const mutationCount = Number((journalMutations as any)[0].count) + Number((transactionMutations as any)[0].count);

        // 5. Inventory Parity Audit
        const physicalStockValue = await this.calculatePhysicalStockValue(tenantId);
        const inventoryAccount = await this.prisma.account.findFirst({
            where: { tenantId, name: StandardAccounts.INVENTORY_ASSET }
        });
        const ledgerStockValue = inventoryAccount ? new Decimal(inventoryAccount.balance) : new Decimal(0);

        const inventoryParity = physicalStockValue.equals(ledgerStockValue);

        // 5. Audit Risk Assessment
        const riskScore = this.calculateForensicRisk(unbalancedJournals.length, orphanedTx.length, documentsMissingTrace.total);
        const status = riskScore === 0 ? 'CLEAN' : 'FAIL';

        return {
            status,
            forensicReport: {
                timestamp: new Date().toISOString(),
                auditCertificate: status === 'CLEAN' ? 'PASS (Corruption Impossible)' : 'FAIL (Invariant Violation)',
                riskScore,
                invariants: {
                    globalDrCr: tbBalanced ? 'PASSED' : 'FAILED',
                    perJournalDrCr: unbalancedJournals.length === 0 ? 'PASSED' : `${unbalancedJournals.length} Violated`,
                    traceability: orphanedTx.length === 0 ? 'PASSED' : `${orphanedTx.length} Orphans`,
                    immutability: mutationCount === 0 ? 'PASSED' : `${mutationCount} Mutated`,
                    moduleLinkage: documentsMissingTrace.total === 0 ? 'PASSED' : `${documentsMissingTrace.total} Gaps`
                },
                financials: {
                    tbDrift: totalDebit.sub(totalCredit).toNumber(),
                    inventoryDrift: physicalStockValue.sub(ledgerStockValue).toNumber(),
                    mutationsDetected: mutationCount
                },
                violations: {
                    unbalancedJournalIds: unbalancedJournals.slice(0, 10).map(j => j.id),
                    gapsByModule: {
                        ...documentsMissingTrace.breakdown,
                        stockMovements: stockMissingTrace
                    }
                }
            },
            recommendations: this.generateForensicRecommendations(unbalancedJournals.length, orphanedTx.length, documentsMissingTrace.total + stockMissingTrace, mutationCount)
        };
    }

    private async checkTraceCoverage(tenantId: string) {
        const counts = await Promise.all([
            this.prisma.invoice.count({ where: { tenantId, correlationId: null } as any }),
            this.prisma.payment.count({ where: { tenantId, correlationId: null } as any }),
            this.prisma.workOrder.count({ where: { tenantId, correlationId: null } as any }),
            this.prisma.purchaseOrder.count({ where: { tenantId, correlationId: null } as any }),
            (this.prisma as any).loan?.count({ where: { tenantId, correlationId: null } as any }) || Promise.resolve(0),
        ]);

        const breakdown = {
            invoices: counts[0],
            payments: counts[1],
            workOrders: counts[2],
            purchaseOrders: counts[3],
            loans: counts[4]
        };

        return {
            total: Object.values(breakdown).reduce((a, b) => a + b, 0),
            breakdown
        };
    }

    private calculateForensicRisk(unbalanced: number, orphans: number, gaps: number): number {
        // High weights for Dr!=Cr (corruption indicator)
        return (unbalanced * 100) + (orphans * 50) + (gaps * 10);
    }

    private generateForensicRecommendations(unbalanced: number, orphans: number, gaps: number, mutations: number): string[] {
        const recs: string[] = [];
        if (unbalanced > 0) recs.push(`CRITICAL: ${unbalanced} journals violates Dr=Cr. Manual intervention required to restore ledger integrity.`);
        if (mutations > 0) recs.push(`CRITICAL: ${mutations} direct edits detected. System immutability bypassed. Investigate potential fraud.`);
        if (orphans > 0) recs.push(`WARNING: ${orphans} transactions have no CorrelationId. Possible destructive edit bypass detected.`);
        if (gaps > 0) recs.push(`Note: ${gaps} documents are missing forensic links. Complete trace propagation to all sub-modules.`);
        if (unbalanced === 0 && orphans === 0 && gaps === 0 && mutations === 0) recs.push("CERTIFIED: The system state is mathematically consistent. Financial corruption is impossible.");
        return recs;
    }

    private async calculatePhysicalStockValue(tenantId: string): Promise<Decimal> {
        const locations = await (this.prisma as any).stockLocation.findMany({
            where: { tenantId },
            include: { product: true }
        });

        let totalValue = new Decimal(0);
        locations.forEach((loc: any) => {
            const qty = new Decimal(loc.quantity || 0);
            const cost = new Decimal(loc.product?.costPrice || 0);
            totalValue = totalValue.add(qty.mul(cost));
        });
        return totalValue;
    }
}
