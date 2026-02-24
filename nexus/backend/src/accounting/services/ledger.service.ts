import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, Prisma } from '@prisma/client';
import { StandardAccounts } from '../constants/account-names';
import { CreateJournalEntryDto } from '../dto/create-journal.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { TraceService } from '../../common/services/trace.service';

@Injectable()
export class LedgerService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
    private readonly traceService: TraceService,
  ) { }

  round2(val: number | string | Decimal): Decimal {
    if (val instanceof Decimal) {
      return val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
    return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Trial Balance Importer (The CA Onboarding Special)
   * Allows importing current balances of all ledgers during migration.
   */
  async importTrialBalance(tenantId: string, csvContent: string) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const results = { total: lines.length - 1, imported: 0, failed: 0, errors: [] as string[] };

    return this.prisma.$transaction(async (tx) => {
      const obAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY } });
      if (!obAcc) throw new BadRequestException("Onboarding Blocked: Opening Balance Equity account missing.");

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',').map(c => c.trim());
        const data: any = {};
        headers.forEach((h, idx) => { data[h] = cols[idx]; });

        try {
          const name = data.accountName || data.name;
          const type = (data.type as AccountType) || AccountType.Asset;
          const ob = parseFloat(data.openingBalance || data.balance || "0");

          if (!name) throw new Error("Account Name is required");
          if (ob === 0) continue; // Skip zero balances

          let account = await tx.account.findFirst({ where: { tenantId, name } });
          if (!account) {
            account = await tx.account.create({
              data: { tenantId, name, type, code: data.code || `OB-${Date.now().toString().slice(-6)}`, balance: 0 }
            });
          }

          // Check if an OB journal already exists for this account to prevent double-entry on re-import
          const existingJournal = await tx.journalEntry.findFirst({
            where: { tenantId, reference: `OB-${account.code}`, description: { contains: 'Opening Balance' } }
          });

          if (!existingJournal) {
            const amount = new Decimal(ob);
            const isDebitNormal = [AccountType.Asset, AccountType.Expense].includes(account.type as any);
            const entryType = isDebitNormal
              ? (amount.isPositive() ? 'Debit' : 'Credit')
              : (amount.isPositive() ? 'Credit' : 'Debit');

            await this.createJournalEntry(tenantId, {
              date: new Date().toISOString(),
              description: `Opening Balance: ${account.name}`,
              reference: `OB-${account.code}`,
              transactions: [
                { accountId: account.id, type: entryType as any, amount: amount.abs().toNumber(), description: 'Trial Balance Migration' },
                { accountId: obAcc.id, type: (entryType === 'Debit' ? 'Credit' : 'Debit') as any, amount: amount.abs().toNumber(), description: 'Offsetting Equity' }
              ]
            }, tx);
            results.imported++;
          }
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Line ${i}: ${e.message}`);
        }
      }
      return results;
    });
  }

  async checkPeriodLock(tenantId: string, date: Date | string, tx?: any) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const cacheKey = `period_lock_${tenantId}_${month}_${year}`;

    let isLocked: boolean | null = null;
    if (!tx) {
      isLocked = await this.cacheManager.get(cacheKey);
    }

    if (isLocked === undefined || isLocked === null) {
      const client = tx || this.prisma;
      const lock = await client.periodLock.findUnique({
        where: { tenantId_month_year: { tenantId, month, year } },
      });
      isLocked = lock?.isLocked || false;
      if (!tx) await this.cacheManager.set(cacheKey, isLocked, 3600000);
    }

    if (isLocked) {
      throw new BadRequestException(
        `This period (${month}/${year}) is locked for Audit.`,
      );
    }
  }

  async createAccount(tenantId: string, data: any) {
    const { openingBalance, ...accountData } = data;

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: { ...accountData, tenantId, balance: 0 },
      });

      if (openingBalance && Number(openingBalance) !== 0) {
        const obAcc = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY },
        });

        if (obAcc) {
          const amount = new Decimal(openingBalance);
          const isDebitNormal = ([AccountType.Asset, AccountType.Expense] as string[]).includes(account.type as string);
          const isDebitEntry = amount.isPositive(); // +ve amount as opening balance is treated as 'Normal' for that account type

          // For Assets: +ve is Debit
          // For Liabilities: +ve is Credit
          const type = isDebitNormal
            ? (isDebitEntry ? 'Debit' : 'Credit')
            : (isDebitEntry ? 'Credit' : 'Debit');

          await this.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Opening Balance: ${account.name}`,
            reference: `OB-${account.code || account.id.slice(0, 8)}`,
            transactions: [
              { accountId: account.id, type: type as any, amount: amount.abs().toNumber(), description: 'Opening Balance Entry' },
              { accountId: obAcc.id, type: (type === 'Debit' ? 'Credit' : 'Debit') as any, amount: amount.abs().toNumber(), description: 'Opening Balance Entry' },
            ],
          }, tx);
        }
      }

      return account;
    });
  }

  async getAccounts(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async initializeTenantAccounts(tenantId: string, tx?: any, industry?: string) {
    const client = tx || this.prisma;

    const baseAccounts = [
      { name: StandardAccounts.ACCOUNTS_RECEIVABLE, type: AccountType.Asset, code: '1001' },
      { name: StandardAccounts.CASH, type: AccountType.Asset, code: '1002' },
      { name: StandardAccounts.BANK, type: AccountType.Asset, code: '1003' },
      { name: StandardAccounts.GST_RECEIVABLE, type: AccountType.Asset, code: '1008' },
      { name: StandardAccounts.OPENING_BALANCE_EQUITY, type: AccountType.Equity, code: '3001' },
      { name: StandardAccounts.ACCOUNTS_PAYABLE, type: AccountType.Liability, code: '2001' },
      { name: StandardAccounts.OUTPUT_IGST, type: AccountType.Liability, code: '2002' },
      { name: StandardAccounts.OUTPUT_CGST, type: AccountType.Liability, code: '2003' },
      { name: StandardAccounts.OUTPUT_SGST, type: AccountType.Liability, code: '2004' },
      { name: StandardAccounts.INPUT_IGST, type: AccountType.Liability, code: '2005' },
      { name: StandardAccounts.INPUT_CGST, type: AccountType.Liability, code: '2006' },
      { name: StandardAccounts.INPUT_SGST, type: AccountType.Liability, code: '2007' },
      { name: StandardAccounts.SALES, type: AccountType.Revenue, code: '4001' },
      { name: StandardAccounts.SALES_RETURNS, type: AccountType.Revenue, code: '4003' },
      { name: StandardAccounts.COGS, type: AccountType.Expense, code: '5001' },
      { name: StandardAccounts.PURCHASE_RETURNS, type: AccountType.Expense, code: '5005' },
      { name: StandardAccounts.SALARY_EXPENSE, type: AccountType.Expense, code: '5002' },
      { name: 'Retained Earnings', type: AccountType.Equity, code: '3002' },
      { name: StandardAccounts.FIXED_ASSETS, type: AccountType.Asset, code: '1101' },
      { name: StandardAccounts.ACCUMULATED_DEPRECIATION, type: AccountType.Asset, code: '1102' },
      { name: StandardAccounts.DEPRECIATION_EXPENSE, type: AccountType.Expense, code: '5003' },

    ];

    const verticalAccounts: any[] = [];

    // Vertical-Specific Chart of Accounts (COA) DNA
    if (industry === 'Manufacturing') {
      verticalAccounts.push(
        { name: StandardAccounts.RAW_MATERIAL_INVENTORY, type: AccountType.Asset, code: '1005' },
        { name: StandardAccounts.FINISHED_GOODS_INVENTORY, type: AccountType.Asset, code: '1006' },
        { name: StandardAccounts.WIP_INVENTORY, type: AccountType.Asset, code: '1007' },
        { name: StandardAccounts.MANUFACTURING_OVERHEAD_ABSORBED, type: AccountType.Revenue, code: '4002' },
        { name: StandardAccounts.SCRAP_EXPENSE, type: AccountType.Expense, code: '5004' }
      );
    } else if (industry === 'Healthcare') {
      verticalAccounts.push(
        { name: 'Pharmacy Inventory', type: AccountType.Asset, code: '1004H' },
        { name: 'Insurance Receivables', type: AccountType.Asset, code: '1009H' },
        { name: 'Patient Service Revenue', type: AccountType.Revenue, code: '4004H' },
        { name: 'Medical Consumables', type: AccountType.Expense, code: '5006H' }
      );
    } else if (industry === 'Construction') {
      verticalAccounts.push(
        { name: 'Project WIP Assets', type: AccountType.Asset, code: '1010C' },
        { name: 'Material at Site', type: AccountType.Asset, code: '1011C' },
        { name: 'Sub-contractor Payables', type: AccountType.Liability, code: '2101C' },
        { name: 'Retention Money Payable', type: AccountType.Liability, code: '2102C' }
      );
    } else if (industry === 'Logistics') {
      verticalAccounts.push(
        { name: 'Fleet Fixed Assets', type: AccountType.Asset, code: '1103L' },
        { name: 'Fuel Control Account', type: AccountType.Expense, code: '5101L' },
        { name: 'Freight Income', type: AccountType.Revenue, code: '4101L' },
        { name: 'Driver Advances', type: AccountType.Asset, code: '1201L' }
      );
    } else if (industry === 'NBFC') {
      verticalAccounts.push(
        { name: 'Loan Portfolio Principal', type: AccountType.Asset, code: '1301F' },
        { name: 'Interest Income - Loans', type: AccountType.Revenue, code: '4301F' },
        { name: 'Risk Provision Reserves', type: AccountType.Equity, code: '3301F' },
        { name: 'KYC & Compliance Expense', type: AccountType.Expense, code: '5301F' }
      );
    } else if (industry !== 'Service') {
      // Default Retail/General Inventory
      verticalAccounts.push(
        { name: StandardAccounts.INVENTORY_ASSET, type: AccountType.Asset, code: '1004' }
      );
    }

    const defaultAccounts = [...baseAccounts, ...verticalAccounts];

    for (const acc of defaultAccounts) {
      const exists = await client.account.findFirst({
        where: {
          tenantId,
          OR: [{ name: acc.name }, { code: acc.code }],
        },
      });

      if (!exists) {
        await client.account.create({
          data: { ...acc, tenantId, balance: 0 },
        });
      }
    }
  }

  async getTransactions(tenantId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { tenantId },
        include: { account: true, journalEntry: true },
        orderBy: { date: 'desc' },
        take: limit,
        skip: skip,
      }),
      this.prisma.transaction.count({ where: { tenantId } }),
    ]);

    return {
      data: transactions.map((t) => ({
        ...t,
        date: t.journalEntry?.date || t.date,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createJournalEntry(tenantId: string, data: CreateJournalEntryDto & { userId?: string }, tx?: any) {
    const totalDebit = data.transactions
      .filter((t) => t.type === 'Debit')
      .reduce((sum, t) => sum.add(this.round2(t.amount)), new Decimal(0))
      .toDecimalPlaces(2);

    const totalCredit = data.transactions
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum.add(this.round2(t.amount)), new Decimal(0))
      .toDecimalPlaces(2);

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Journal entry must balance exactly using rounded amounts (2 decimal places). Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    if (totalDebit.isZero()) {
      throw new BadRequestException('Journal entry cannot be for zero amount.');
    }

    // Verify all transactions belong to the same tenant or are valid
    for (const t of data.transactions) {
      if (new Decimal(t.amount).isZero()) {
        throw new BadRequestException('Individual transactions cannot have zero amount.');
      }
    }

    const execute = async (client: any) => {
      await this.checkPeriodLock(tenantId, data.date || new Date(), client);

      const journal = await client.journalEntry.create({
        data: {
          tenantId,
          date: new Date(data.date),
          description: data.description,
          reference: data.reference,
          correlationId: data.correlationId || this.traceService.getCorrelationId(),
          createdById: data.userId,
          posted: true,
        },
      });

      for (const t of data.transactions) {
        const roundedAmount = this.round2(t.amount);
        await client.transaction.create({
          data: {
            tenantId,
            accountId: t.accountId,
            amount: roundedAmount,
            type: t.type,
            description: t.description || data.description,
            journalEntryId: journal.id,
            correlationId: journal.correlationId, // Forensic Propagation
          },
        });

        const account = await client.account.findFirst({
          where: { id: t.accountId, tenantId },
        });
        if (!account) throw new BadRequestException(`Account ${t.accountId} not found`);

        let balanceChange = new Decimal(t.amount);
        const isDebit = t.type === 'Debit';
        const isAssetOrExpense = ([AccountType.Asset, AccountType.Expense] as AccountType[]).includes(account.type);

        if (isAssetOrExpense) {
          balanceChange = isDebit ? balanceChange : balanceChange.negated();
        } else {
          balanceChange = isDebit ? balanceChange.negated() : balanceChange;
        }

        await client.account.updateMany({
          where: { id: t.accountId, tenantId },
          data: { balance: { increment: balanceChange } },
        });
      }

      return journal;
    };

    if (tx) {
      return execute(tx);
    }

    return this.prisma.$transaction(async (ptx) => {
      return execute(ptx);
    });
  }
}
