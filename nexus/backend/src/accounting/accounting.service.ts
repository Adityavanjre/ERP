import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { LedgerService } from './services/ledger.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { TallyService } from './services/tally-export.service';
import { CreateJournalEntryDto } from './dto/create-journal.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly invoice: InvoiceService,
    private readonly payment: PaymentService,
    private readonly tally: TallyService,
  ) {}

  // --- Chart of Accounts ---
  async createAccount(tenantId: string, data: any) {
    return this.ledger.createAccount(tenantId, data);
  }

  async getAccounts(tenantId: string) {
    return this.ledger.getAccounts(tenantId);
  }

  async initializeTenantAccounts(tenantId: string, tx?: any) {
    return this.ledger.initializeTenantAccounts(tenantId, tx);
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

  // --- Payments ---
  async createPayment(tenantId: string, data: CreatePaymentDto) {
    return this.payment.createPayment(tenantId, data);
  }

  async getCustomerLedger(tenantId: string, customerId: string) {
    return this.payment.getCustomerLedger(tenantId, customerId);
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
      const debit = isDebitNormal && balance.gt(0) ? balance : new Decimal(0);
      const credit = !isDebitNormal && balance.gt(0) ? balance : new Decimal(0);

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
    return this.prisma.fixedAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFixedAsset(tenantId: string, data: any) {
    const asset = await this.prisma.fixedAsset.create({
      data: { ...data, tenantId },
    });

    // Post journal: Dr Fixed Assets / Cr Cash or Accounts Payable
    const fixedAssetAccount = await this.prisma.account.findFirst({
      where: { tenantId, name: { in: ['Fixed Assets', 'Property Plant & Equipment'] } },
    });
    const cashAccount = await this.prisma.account.findFirst({
      where: { tenantId, name: { in: ['Cash', 'Bank', 'Accounts Payable'] } },
    });

    if (fixedAssetAccount && cashAccount) {
      await this.ledger.createJournalEntry(tenantId, {
        date: new Date().toISOString(),
        description: `Fixed Asset Purchase: ${asset.name} (${asset.assetCode})`,
        reference: asset.id,
        transactions: [
          { accountId: fixedAssetAccount.id, type: 'Debit' as any, amount: Number(data.purchaseValue), description: `Asset: ${asset.name}` },
          { accountId: cashAccount.id, type: 'Credit' as any, amount: Number(data.purchaseValue), description: `Asset: ${asset.name}` },
        ],
      });
    }

    return asset;
  }

  async runMonthlyDepreciation(tenantId: string, assetId: string) {
    const asset = await this.prisma.fixedAsset.findFirst({
      where: { id: assetId, tenantId, status: 'Active' },
    });
    if (!asset) throw new BadRequestException('Active fixed asset not found');

    const bookValue = new Decimal(asset.purchaseValue).sub(new Decimal(asset.accumulatedDepreciation));
    const monthlyDepreciation = bookValue.div(asset.usefulLife).toDecimalPlaces(2);

    if (monthlyDepreciation.lte(0)) {
      throw new BadRequestException('Asset is fully depreciated');
    }

    await this.prisma.fixedAsset.update({
      where: { id: assetId },
      data: { accumulatedDepreciation: { increment: monthlyDepreciation } },
    });

    const deprAccount = await this.prisma.account.findFirst({
      where: { tenantId, name: { in: ['Depreciation Expense'] } },
    });
    const accumDeprAccount = await this.prisma.account.findFirst({
      where: { tenantId, name: { in: ['Accumulated Depreciation'] } },
    });

    if (deprAccount && accumDeprAccount) {
      await this.ledger.createJournalEntry(tenantId, {
        date: new Date().toISOString(),
        description: `Monthly Depreciation: ${asset.name}`,
        reference: asset.id,
        transactions: [
          { accountId: deprAccount.id, type: 'Debit' as any, amount: Number(monthlyDepreciation), description: `Depreciation: ${asset.name}` },
          { accountId: accumDeprAccount.id, type: 'Credit' as any, amount: Number(monthlyDepreciation), description: `Depreciation: ${asset.name}` },
        ],
      });
    }

    return { asset: asset.name, monthlyDepreciation: monthlyDepreciation.toFixed(2) };
  }
}

