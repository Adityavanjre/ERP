import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { LedgerService } from './services/ledger.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { TallyService } from './services/tally-export.service';
import { CreditNoteService } from './services/credit-note.service';
import { DebitNoteService } from './services/debit-note.service';
import { FixedAssetService } from './services/fixed-asset.service';
import { CreateJournalEntryDto } from './dto/create-journal.dto';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { StandardAccounts } from './constants/account-names';

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    public readonly ledger: LedgerService,
    private readonly invoice: InvoiceService,
    private readonly payment: PaymentService,
    private readonly tally: TallyService,
    private readonly creditNote: CreditNoteService,
    private readonly debitNote: DebitNoteService,
    private readonly fixedAsset: FixedAssetService,
  ) { }


  // --- Chart of Accounts ---
  async createAccount(tenantId: string, data: any) {
    return this.ledger.createAccount(tenantId, data);
  }

  async getAccounts(tenantId: string) {
    return this.ledger.getAccounts(tenantId);
  }

  async initializeTenantAccounts(tenantId: string, tx?: any, industry?: string) {
    return this.ledger.initializeTenantAccounts(tenantId, tx, industry);
  }

  async deleteInvoice(tenantId: string, id: string) {
    return this.invoice.deleteInvoice(tenantId, id);
  }

  // --- Transactions / Journals ---
  async getTransactions(tenantId: string, page: number = 1, limit: number = 50) {
    return this.ledger.getTransactions(tenantId, page, limit);
  }

  async createJournalEntry(tenantId: string, data: CreateJournalEntryDto) {
    return this.ledger.createJournalEntry(tenantId, data);
  }

  // --- Invoices ---
  async createInvoice(tenantId: string, data: any, txOverride?: any, deductStock: boolean = true) {
    return this.invoice.createInvoice(tenantId, data, txOverride, deductStock);
  }

  async getInvoices(tenantId: string, page: number = 1, limit: number = 50) {
    return this.invoice.getInvoices(tenantId, page, limit);
  }

  async createInvoicesBulk(tenantId: string, invoices: any[]) {
    return this.invoice.createInvoicesBulk(tenantId, invoices);
  }

  async cancelInvoice(tenantId: string, id: string, reason: string) {
    return this.invoice.cancelInvoice(tenantId, id, reason);
  }

  // --- Payments ---
  async createPayment(tenantId: string, data: CreatePaymentDto) {
    return this.payment.createPayment(tenantId, data);
  }

  async getCustomerLedger(tenantId: string, customerId: string) {
    return this.payment.getCustomerLedger(tenantId, customerId);
  }

  // --- Credit & Debit Notes ---
  async createCreditNote(tenantId: string, data: any) {
    return this.creditNote.create(tenantId, data);
  }

  async getCreditNotes(tenantId: string) {
    return this.creditNote.findAll(tenantId);
  }

  async createDebitNote(tenantId: string, data: any) {
    return this.debitNote.create(tenantId, data);
  }

  async getDebitNotes(tenantId: string) {
    return this.debitNote.findAll(tenantId);
  }

  async createCustomerOpeningBalance(tenantId: string, data: any) {
    return this.payment.createCustomerOpeningBalance(tenantId, data);
  }

  async createSupplierOpeningBalance(tenantId: string, data: any) {
    return this.payment.createSupplierOpeningBalance(tenantId, data);
  }

  async getSupplierLedger(tenantId: string, supplierId: string) {
    return this.payment.getSupplierLedger(tenantId, supplierId);
  }


  // --- Fixed Assets & Depreciation ---
  // NOTE: getFixedAssets, createFixedAsset, runMonthlyDepreciation are defined at the bottom of this service.
  //       runDepreciation (bulk, month-level) is kept here for backward compatibility.

  async runDepreciation(tenantId: string, month: number, year: number) {
    // 0. Governance Check
    await this.checkPeriodLock(tenantId, new Date(year, month - 1));

    const assets = await (this.prisma as any).fixedAsset.findMany({
      where: { tenantId, status: 'Active' },
    });

    const entries: { asset: any; charge: Decimal }[] = [];

    for (const asset of assets) {
      const depreciableAmount = asset.purchaseValue.minus(asset.salvageValue);
      const monthlyCharge = depreciableAmount.div(asset.usefulLife).toDecimalPlaces(2);

      // Guard: Don't over-depreciate
      const remainingToDepreciate = depreciableAmount.minus(asset.accumulatedDepreciation);
      const finalCharge = Decimal.min(monthlyCharge, remainingToDepreciate);

      if (finalCharge.gt(0)) {
        entries.push({ asset, charge: finalCharge });
      }
    }

    if (entries.length === 0) return { message: 'No depreciation required for this period.' };

    return this.prisma.$transaction(async (tx) => {
      const depExpAccount = await tx.account.findFirst({ where: { tenantId, name: 'Depreciation Expense' } });
      const accDepAccount = await tx.account.findFirst({ where: { tenantId, name: 'Accumulated Depreciation' } });

      if (!depExpAccount || !accDepAccount) {
        throw new BadRequestException('Depreciation accounts not found in Chart of Accounts.');
      }

      for (const entry of entries) {
        // 1. Update Asset
        const newAccumulated = entry.asset.accumulatedDepreciation.plus(entry.charge);
        const isFullyDepreciated = newAccumulated.equals(entry.asset.purchaseValue.minus(entry.asset.salvageValue));

        await (tx as any).fixedAsset.updateMany({
          where: { id: entry.asset.id, tenantId },
          data: {
            accumulatedDepreciation: newAccumulated,
            status: isFullyDepreciated ? 'FullyDepreciated' : 'Active',
          },
        });

        // 2. Book Journal
        await this.ledger.createJournalEntry(tenantId, {
          date: new Date(year, month - 1, 28).toISOString(), // Standardized string date
          description: `Monthly Depreciation: ${entry.asset.name} (${entry.asset.assetCode})`,
          reference: `DEP-${entry.asset.assetCode}-${month}-${year}`,
          transactions: [
            { accountId: depExpAccount.id, type: 'Debit', amount: Number(entry.charge.toFixed(2)), description: 'Depreciation Charge' },
            { accountId: accDepAccount.id, type: 'Credit', amount: Number(entry.charge.toFixed(2)), description: 'Accumulated Prov' },
          ],
        }, tx);
      }

      return { message: `Depreciation processed for ${entries.length} assets.` };
    });
  }

  // --- Tally & Auditor ---
  async validateTallyData(tenantId: string, month: number, year: number) {
    return this.tally.validateTallyData(tenantId, month, year);
  }

  async getStats(tenantId: string) {
    return this.tally.getStats(tenantId);
  }

  async exportTallyXml(tenantId: string, month?: number, year?: number) {
    return this.tally.exportTallyXml(tenantId, month, year);
  }

  async getAuditorDashboard(tenantId: string, month: number, year: number) {
    return this.tally.getAuditorDashboard(tenantId, month, year);
  }

  async togglePeriodLock(tenantId: string, month: number, year: number, userId: string, action: 'LOCK' | 'UNLOCK', reason?: string) {
    return this.tally.togglePeriodLock(tenantId, month, year, userId, action, reason);
  }

  async exportLedgerMasters(tenantId: string) {
    return this.tally.exportLedgerMasters(tenantId);
  }

  // Internal Helpers (needed for other services potentially)
  async checkPeriodLock(tenantId: string, date: Date | string, tx?: any) {
    // Ensure date is treated as Date | string to match LedgerService
    return this.ledger.checkPeriodLock(tenantId, date, tx);
  }

  round2(val: any) {
    return this.ledger.round2(val);
  }

  async getTrialBalance(tenantId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    const rows = accounts.map((acct) => {
      const balance = new Decimal(acct.balance || 0);
      // Normal balance convention: Asset & Expense have debit normal; rest credit normal
      const isDebitNormal = acct.type === 'Asset' || acct.type === 'Expense';

      let debit = new Decimal(0);
      let credit = new Decimal(0);

      if (isDebitNormal) {
        if (balance.gte(0)) debit = balance;
        else credit = balance.abs();
      } else {
        if (balance.gte(0)) credit = balance;
        else debit = balance.abs();
      }

      totalDebit = totalDebit.add(debit);
      totalCredit = totalCredit.add(credit);

      return {
        id: acct.id,
        name: acct.name,
        type: acct.type,
        balance: balance.toFixed(2),
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
      };
    });

    return {
      accounts: rows,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      balanced: totalDebit.equals(totalCredit),
    };
  }

  async getProfitLoss(tenantId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, type: { in: ['Revenue', 'Expense'] } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    let totalRevenue = new Decimal(0);
    let totalExpense = new Decimal(0);

    const revenue = accounts.filter(a => a.type === 'Revenue').map(a => {
      const bal = new Decimal(a.balance || 0);
      totalRevenue = totalRevenue.add(bal);
      return { id: a.id, name: a.name, balance: bal.toFixed(2) };
    });

    const expenses = accounts.filter(a => a.type === 'Expense').map(a => {
      const bal = new Decimal(a.balance || 0);
      totalExpense = totalExpense.add(bal);
      return { id: a.id, name: a.name, balance: bal.toFixed(2) };
    });

    const netProfit = totalRevenue.sub(totalExpense);

    return {
      revenue,
      expenses,
      totalRevenue: totalRevenue.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netProfit: netProfit.toFixed(2),
      isProfitable: netProfit.gte(0),
    };
  }

  // --- Fixed Assets ---
  async getFixedAssets(tenantId: string) {
    return this.fixedAsset.findAll(tenantId);
  }

  async createFixedAsset(tenantId: string, data: any) {
    return this.fixedAsset.create(tenantId, data);
  }

  async runMonthlyDepreciation(tenantId: string, assetId: string) {
    return this.fixedAsset.runMonthlyDepreciation(tenantId, assetId);
  }

  /**
   * Financial Year Closing Logic
   */
  async closeFinancialYear(tenantId: string, year: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify all 12 months are locked
      const locks = await tx.periodLock.findMany({
        where: { tenantId, year, isLocked: true },
      });

      if (locks.length < 12) {
        throw new BadRequestException(`Cannot close Financial Year ${year}. All 12 months must be locked by an Auditor first.`);
      }

      const closingDate = new Date(year, 11, 31);

      // 2. Get P&L accounts (Revenue & Expense)
      const plAccounts = await tx.account.findMany({
        where: { tenantId, type: { in: ['Revenue', 'Expense'] } },
      });

      let netProfit = new Decimal(0);
      const journalTransactions: any[] = [];

      for (const acc of plAccounts) {
        const bal = new Decimal(acc.balance || 0);
        if (bal.isZero()) continue;

        if (acc.type === 'Revenue') {
          netProfit = netProfit.add(bal);
          journalTransactions.push({
            accountId: acc.id,
            type: 'Debit',
            amount: bal.toNumber(),
            description: `Year-End Close: Zeroing ${acc.name}`,
          });
        } else {
          netProfit = netProfit.sub(bal);
          journalTransactions.push({
            accountId: acc.id,
            type: 'Credit',
            amount: bal.toNumber(),
            description: `Year-End Close: Zeroing ${acc.name}`,
          });
        }
      }

      if (journalTransactions.length === 0) {
        return { message: `Year ${year} already appears closed or has no balances.`, year };
      }

      const retainedEarnings = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.RETAINED_EARNINGS },
      });

      if (!retainedEarnings) {
        throw new BadRequestException('Retained Earnings account not found. Please initialize COA.');
      }

      if (netProfit.greaterThan(0)) {
        journalTransactions.push({
          accountId: retainedEarnings.id,
          type: 'Credit',
          amount: netProfit.toNumber(),
          description: `Year-End Close: Transfer Net Profit to Equity`,
        });
      } else if (netProfit.lessThan(0)) {
        journalTransactions.push({
          accountId: retainedEarnings.id,
          type: 'Debit',
          amount: netProfit.abs().toNumber(),
          description: `Year-End Close: Transfer Net Loss to Equity`,
        });
      }

      await this.ledger.createJournalEntry(tenantId, {
        date: closingDate.toISOString(),
        description: `Financial Year ${year} Closing Entry`,
        reference: `FY-CLOSE-${year}`,
        transactions: journalTransactions,
      }, tx);

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'YEAR_END_CLOSE',
          resource: 'FinancialYear',
          details: {
            year,
            netProfit: netProfit.toFixed(2),
            msg: `Closed financial year ${year}`
          } as any,
        },
      });

      return {
        success: true,
        year,
        netProfit: netProfit.toFixed(2),
        message: `Financial Year ${year} closed successfully. All P&L balances moved to Retained Earnings.`,
      };
    });
  }
}


