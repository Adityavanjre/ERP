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
  async createFixedAsset(tenantId: string, data: any) {
    return (this.prisma as any).fixedAsset.create({
      data: {
        ...data,
        tenantId,
        purchaseValue: new Decimal(data.purchaseValue),
        salvageValue: new Decimal(data.salvageValue || 0),
        accumulatedDepreciation: new Decimal(0),
      },
    });
  }

  async getFixedAssets(tenantId: string) {
    return (this.prisma as any).fixedAsset.findMany({
      where: { tenantId },
    });
  }

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

        await (tx as any).fixedAsset.update({
          where: { id: entry.asset.id },
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
}
