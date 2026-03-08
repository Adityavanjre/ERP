import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BrsService {
  constructor(private prisma: PrismaService) {}

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
      throw new Error(
        'Import Blocked: No valid statement lines found in payload after deduplication.',
      );
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
      orderBy: { date: 'asc' },
    });

    if (statementLines.length === 0) return [];

    const results = [];
    const createOps = [];
    const updateLineIds = [];

    // BNK-002: Batch fetch to resolve N+1 performance bottleneck on 1000+ CSV imports
    const minDate = new Date(statementLines[0].date);
    minDate.setDate(minDate.getDate() - 3);

    const maxDate = new Date(statementLines[statementLines.length - 1].date);
    maxDate.setDate(maxDate.getDate() + 3);

    const allTransactions = await this.prisma.transaction.findMany({
      where: {
        tenantId,
        date: { gte: minDate, lte: maxDate },
        reconciliations: { none: {} },
      },
    });

    const usedTransactionIds = new Set<string>();

    // In-memory matching Engine
    for (const line of statementLines) {
      const lineTime = new Date(line.date).getTime();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      const possibleMatches = allTransactions.filter((t) => {
        if (usedTransactionIds.has(t.id)) return false;
        // strict match on precise amount
        if (
          !new Decimal(t.amount as any).equals(new Decimal(line.amount as any))
        )
          return false;
        const txTime = new Date(t.date).getTime();
        return Math.abs(txTime - lineTime) <= threeDaysMs;
      });

      // Only auto-match if exactly ONE match is found (no ambiguity)
      if (possibleMatches.length === 1) {
        const matchedTx = possibleMatches[0];
        usedTransactionIds.add(matchedTx.id);

        createOps.push({
          tenantId,
          transactionId: matchedTx.id,
          statementLineId: line.id,
        });
        updateLineIds.push(line.id);

        results.push({
          lineId: line.id,
          transactionId: matchedTx.id,
          status: 'Matched',
        });
      }
    }

    // Commit all resolved states safely in one atomic swipe
    if (createOps.length > 0) {
      await this.prisma.$transaction([
        this.prisma.bankReconciliation.createMany({ data: createOps }),
        this.prisma.bankStatementLine.updateMany({
          where: { id: { in: updateLineIds } },
          data: { reconciled: true },
        }),
      ]);
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
        where: { id: reconId, tenantId, statementLineId: lineId },
      });

      if (!recon) throw new Error('Reconciliation record not found');

      await tx.bankReconciliation.delete({
        where: { id: reconId },
      });

      await tx.bankStatementLine.update({
        where: { id: lineId },
        data: { reconciled: false },
      });

      return { success: true, message: 'Transaction successfully unmatched' };
    });
  }

  async getReconciliationReport(
    tenantId: string,
    accountId: string,
    endDateStr: string,
  ) {
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

    unclearedTransactions.forEach((t) => {
      // Assuming Debit increases asset balance (Receipts) and Credit decreases (Payments)
      if (t.type === 'Debit') {
        unclearedDeposits = unclearedDeposits.add(t.amount);
      } else {
        unclearedChecks = unclearedChecks.add(t.amount);
      }
    });

    // Bank Balance = Book Balance + Uncleared Checks (Add back) - Uncleared Deposits (Deduct)
    const theoreticalPassbookBalance = bookBalance
      .add(unclearedChecks)
      .minus(unclearedDeposits);

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
                transaction: true,
              },
            },
          },
        },
      },
    });
  }
}
