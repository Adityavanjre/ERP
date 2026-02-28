import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BrsService {
    constructor(private prisma: PrismaService) { }

    async uploadStatement(tenantId: string, accountId: string, data: any) {
        // SECURITY (BNK-002): Sanitize bank statement lines (remove blanks, prevent duplicates)
        const uniqueLines = new Map<string, any>();
        for (const line of data.lines || []) {
            if (!line.date || !line.amount) continue; // Skip blank/invalid lines
            
            // Generate a deterministic hash for deduplication
            const lineHash = `${new Date(line.date).toISOString().split('T')[0]}_${line.amount}_${line.reference || line.description}`;
            uniqueLines.set(lineHash, line);
        }

        const sanitizedLines = Array.from(uniqueLines.values());
        if (sanitizedLines.length === 0) {
            throw new Error('Import Blocked: No valid statement lines found in payload after deduplication.');
        }

        return this.prisma.bankStatement.create({
            data: {
                tenantId,
                accountId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                openingBalance: data.openingBalance,
                closingBalance: data.closingBalance,
                lines: {
                    create: sanitizedLines.map((line: any) => ({
                        tenantId,
                        date: new Date(line.date),
                        description: line.description,
                        amount: line.amount,
                        reference: line.reference,
                        type: line.type,
                    })),
                },
            },
            include: { lines: true },
        });
    }

    async autoMatch(tenantId: string, statementId: string) {
        const statementLines = await this.prisma.bankStatementLine.findMany({
            where: { statementId, tenantId, reconciled: false },
        });

        const results = [];

        for (const line of statementLines) {
            // Match by Amount and Date within +/- 3 days
            const startDate = new Date(line.date);
            startDate.setDate(startDate.getDate() - 3);
            const endDate = new Date(line.date);
            endDate.setDate(endDate.getDate() + 3);

            const possibleMatches = await this.prisma.transaction.findMany({
                where: {
                    tenantId,
                    amount: line.amount,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    reconciliations: { none: {} },
                },
            });

            if (possibleMatches.length === 1) {
                await this.prisma.$transaction([
                    this.prisma.bankReconciliation.create({
                        data: {
                            tenantId,
                            transactionId: possibleMatches[0].id,
                            statementLineId: line.id,
                        },
                    }),
                    this.prisma.bankStatementLine.update({
                        where: { id: line.id },
                        data: { reconciled: true },
                    }),
                ]);

                results.push({ lineId: line.id, transactionId: possibleMatches[0].id, status: 'Matched' });
            }
        }

        return results;
    }

    async manualMatch(tenantId: string, lineId: string, transactionId: string) {
        return this.prisma.$transaction(async (tx) => {
            const recon = await tx.bankReconciliation.create({
                data: {
                    tenantId,
                    transactionId,
                    statementLineId: lineId,
                },
            });

            await tx.bankStatementLine.update({
                where: { id: lineId },
                data: { reconciled: true },
            });

            return recon;
        });
    }

    // SECURITY (BNK-003): Safe un-matching workflow
    async unmatchTransaction(tenantId: string, lineId: string, reconId: string) {
        return this.prisma.$transaction(async (tx) => {
            const recon = await tx.bankReconciliation.findFirst({
                where: { id: reconId, tenantId, statementLineId: lineId }
            });

            if (!recon) throw new Error('Reconciliation record not found');

            await tx.bankReconciliation.delete({
                where: { id: reconId }
            });

            await tx.bankStatementLine.update({
                where: { id: lineId },
                data: { reconciled: false },
            });

            return { success: true, message: 'Transaction successfully unmatched' };
        });
    }

    async getReconciliationReport(tenantId: string, accountId: string, endDateStr: string) {
        const endDate = new Date(endDateStr);
        const account = await this.prisma.account.findUnique({
            where: { id: accountId, tenantId },
        });

        if (!account) throw new Error('Account not found');

        // Book Balance as of Date
        const bookBalance = account.balance;

        // Uncleared Transactions (Checks issued but not cleared, or Deposits not cleared)
        const unclearedTransactions = await this.prisma.transaction.findMany({
            where: {
                accountId,
                tenantId,
                date: { lte: endDate },
                reconciliations: { none: {} },
            },
        });

        let unclearedChecks = new Decimal(0); // Payments in books not in bank
        let unclearedDeposits = new Decimal(0); // Receipts in books not in bank

        unclearedTransactions.forEach(t => {
            // Assuming Debit increases asset balance (Receipts) and Credit decreases (Payments)
            if (t.type === 'Debit') {
                unclearedDeposits = unclearedDeposits.add(t.amount);
            } else {
                unclearedChecks = unclearedChecks.add(t.amount);
            }
        });

        // Bank Balance = Book Balance + Uncleared Checks (Add back) - Uncleared Deposits (Deduct)
        const theoreticalPassbookBalance = bookBalance.add(unclearedChecks).minus(unclearedDeposits);

        return {
            accountName: account.name,
            asOf: endDate,
            balanceAsPerBooks: bookBalance,
            addUnclearedChecks: unclearedChecks,
            lessUnclearedDeposits: unclearedDeposits,
            balanceAsPerBank: theoreticalPassbookBalance,
        };
    }

    async getStatementDetails(tenantId: string, statementId: string) {
        return this.prisma.bankStatement.findUnique({
            where: { id: statementId, tenantId },
            include: {
                lines: {
                    include: {
                        reconciliations: {
                            include: {
                                transaction: true
                            }
                        }
                    }
                }
            }
        });
    }
}
