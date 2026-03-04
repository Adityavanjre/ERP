import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, Prisma } from '@prisma/client';
import { Industry } from '@nexus/shared';
import { StandardAccounts } from '../constants/account-names';
import { BillingService } from '../../system/services/billing.service';
import { CreateJournalEntryDto } from '../dto/create-journal.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { TraceService } from '../../common/services/trace.service';

@Injectable()
export class LedgerService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
    private readonly traceService: TraceService,
    private billing: BillingService,
  ) { }

  round2(val: number | string | Decimal): Decimal {
    if (val instanceof Decimal) {
      return val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
    return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }


  async checkPeriodLock(tenantId: string, date: Date | string, tx?: any) {
    const d = new Date(date);

    // SECURITY (ACC-004): Temporal Bounding against absurd dates that crash archiving or distort ledgers
    const now = new Date();
    const futureBound = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
    const pastBound = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // -5 years

    if (d > futureBound) {
      throw new BadRequestException('Temporal Integrity Violation: Future-dating beyond 30 days is prohibited.');
    }
    if (d < pastBound) {
      throw new BadRequestException('Temporal Integrity Violation: Backdating beyond 5 years is prohibited.');
    }

    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const cacheKey = `nexus:period_lock:${tenantId}:${month}:${year}`;

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

  async getAccounts(tenantId: string, page: number = 1, limit: number = 100, isActive: boolean = false) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (isActive) where.isActive = true;

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        orderBy: { code: 'asc' },
        take: limit,
        skip,
      }),
      this.prisma.account.count({ where }),
    ]);

    return {
      data: accounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async initializeTenantAccounts(tenantId: string, tx?: any, industry?: string) {
    const client = tx || this.prisma;

    const baseAccounts = [
      { name: StandardAccounts.ACCOUNTS_RECEIVABLE, type: AccountType.Asset, code: '1001' },
      { name: StandardAccounts.CASH, type: AccountType.Asset, code: '1002' },
      { name: StandardAccounts.BANK, type: AccountType.Asset, code: '1003' },
      { name: StandardAccounts.GST_RECEIVABLE, type: AccountType.Asset, code: '1008' },
      // INPUT GST accounts (ITC claimable) are Assets — they represent tax paid
      // to suppliers that is recoverable from the government. Classifying these as
      // Liability was a statutory error that produced incorrect Balance Sheets.
      { name: StandardAccounts.INPUT_IGST, type: AccountType.Asset, code: '1009' },
      { name: StandardAccounts.INPUT_CGST, type: AccountType.Asset, code: '1010' },
      { name: StandardAccounts.INPUT_SGST, type: AccountType.Asset, code: '1011' },
      { name: StandardAccounts.OPENING_BALANCE_EQUITY, type: AccountType.Equity, code: '3001' },
      { name: StandardAccounts.ACCOUNTS_PAYABLE, type: AccountType.Liability, code: '2001' },
      // OUTPUT GST accounts (GST charged to customers) remain Liability
      { name: StandardAccounts.OUTPUT_IGST, type: AccountType.Liability, code: '2002' },
      { name: StandardAccounts.OUTPUT_CGST, type: AccountType.Liability, code: '2003' },
      { name: StandardAccounts.OUTPUT_SGST, type: AccountType.Liability, code: '2004' },
      { name: StandardAccounts.SALES, type: AccountType.Revenue, code: '4001' },
      { name: StandardAccounts.SALES_RETURNS, type: AccountType.Revenue, code: '4003' },
      { name: StandardAccounts.COGS, type: AccountType.Expense, code: '5001' },
      { name: StandardAccounts.PURCHASE_RETURNS, type: AccountType.Expense, code: '5005' },
      { name: StandardAccounts.SALARY_EXPENSE, type: AccountType.Expense, code: '5002' },
      { name: 'Retained Earnings', type: AccountType.Equity, code: '3002' },
      { name: StandardAccounts.FIXED_ASSETS, type: AccountType.Asset, code: '1101' },
      { name: StandardAccounts.ACCUMULATED_DEPRECIATION, type: AccountType.Asset, code: '1102' },
      { name: StandardAccounts.DEPRECIATION_EXPENSE, type: AccountType.Expense, code: '5003' },
      { name: StandardAccounts.SUPPLIER_ADVANCE, type: AccountType.Asset, code: '1012' },
      { name: StandardAccounts.CUSTOMER_ADVANCE, type: AccountType.Liability, code: '2005' },

    ];

    const verticalAccounts: any[] = [];

    // Vertical-Specific Chart of Accounts (COA) DNA
    if (industry === Industry.Manufacturing) {
      verticalAccounts.push(
        { name: StandardAccounts.RAW_MATERIAL_INVENTORY, type: AccountType.Asset, code: '1005' },
        { name: StandardAccounts.FINISHED_GOODS_INVENTORY, type: AccountType.Asset, code: '1006' },
        { name: StandardAccounts.WIP_INVENTORY, type: AccountType.Asset, code: '1007' },
        { name: StandardAccounts.MANUFACTURING_OVERHEAD_ABSORBED, type: AccountType.Revenue, code: '4002' },
        { name: StandardAccounts.SCRAP_EXPENSE, type: AccountType.Expense, code: '5004' }
      );
    } else if (industry === Industry.Healthcare) {
      verticalAccounts.push(
        { name: 'Pharmacy Inventory', type: AccountType.Asset, code: '1004H' },
        { name: 'Insurance Receivables', type: AccountType.Asset, code: '1009H' },
        { name: 'Patient Service Revenue', type: AccountType.Revenue, code: '4004H' },
        { name: 'Medical Consumables', type: AccountType.Expense, code: '5006H' }
      );
    } else if (industry === Industry.Construction) {
      verticalAccounts.push(
        { name: 'Project WIP Assets', type: AccountType.Asset, code: '1010C' },
        { name: 'Material at Site', type: AccountType.Asset, code: '1011C' },
        { name: 'Sub-contractor Payables', type: AccountType.Liability, code: '2101C' },
        { name: 'Retention Money Payable', type: AccountType.Liability, code: '2102C' }
      );
    } else if (industry === Industry.Logistics) {
      verticalAccounts.push(
        { name: 'Fleet Fixed Assets', type: AccountType.Asset, code: '1103L' },
        { name: 'Fuel Control Account', type: AccountType.Expense, code: '5101L' },
        { name: 'Freight Income', type: AccountType.Revenue, code: '4101L' },
        { name: 'Driver Advances', type: AccountType.Asset, code: '1201L' }
      );
    } else if (industry === Industry.NBFC) {
      verticalAccounts.push(
        { name: 'Loan Portfolio Principal', type: AccountType.Asset, code: '1301F' },
        { name: 'Interest Income - Loans', type: AccountType.Revenue, code: '4301F' },
        { name: 'Risk Provision Reserves', type: AccountType.Equity, code: '3301F' },
        { name: 'KYC & Compliance Expense', type: AccountType.Expense, code: '5301F' }
      );
    } else if (industry !== Industry.Service) {
      // Default Retail/General Inventory
      verticalAccounts.push(
        { name: StandardAccounts.INVENTORY_ASSET, type: AccountType.Asset, code: '1004' }
      );
    }

    const defaultAccounts = [...baseAccounts, ...verticalAccounts];

    const accountData = defaultAccounts.map(acc => ({
      ...acc,
      tenantId,
      balance: 0,
    }));

    await client.account.createMany({
      data: accountData,
      skipDuplicates: true,
    });
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

    // SECURITY (ACC-001): Enforce strict positive amounts. 
    // Negative amounts can act as silent contra-entries and bypass standard ledger reconciliation.
    for (const t of data.transactions) {
      if (new Decimal(t.amount).lte(0)) {
        throw new BadRequestException('Individual transaction amounts must be strictly greater than zero.');
      }
    }

    const execute = async (client: any) => {
      await this.checkPeriodLock(tenantId, data.date || new Date(), client);
      // SECURITY (BILL-001): Atomic Quota Check with row-level lock
      await this.billing.checkQuota(tenantId, 'maxLedgerEntries', client);

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

      const correlationId = journal.correlationId;

      // 1. Prefetch all accounts referenced in this entry in ONE query
      const accountIds = [...new Set(data.transactions.map((t) => t.accountId))];
      const accounts = await client.account.findMany({
        where: { id: { in: accountIds }, tenantId },
      });
      const accountMap = new Map<string, any>(accounts.map((a: any) => [a.id, a]));

      for (const t of data.transactions) {
        if (!accountMap.has(t.accountId)) {
          throw new BadRequestException(`Account ${t.accountId} not found or does not belong to tenant`);
        }
      }

      // 2. Batch-create all transaction legs in ONE INSERT
      await client.transaction.createMany({
        data: data.transactions.map((t) => ({
          tenantId,
          accountId: t.accountId,
          amount: this.round2(t.amount),
          type: t.type,
          description: t.description || data.description,
          journalEntryId: journal.id,
          correlationId,
        })),
      });

      // 3. Compute net balance delta per account in-memory, then ONE updateMany per account
      const balanceDeltas = new Map<string, Decimal>();
      for (const t of data.transactions) {
        const account = accountMap.get(t.accountId);
        const roundedAmount = this.round2(t.amount);
        const isDebit = t.type === 'Debit';
        const isAssetOrExpense = ([AccountType.Asset, AccountType.Expense] as AccountType[]).includes(account.type);

        let delta: Decimal;
        if (isAssetOrExpense) {
          delta = isDebit ? roundedAmount : roundedAmount.negated();
        } else {
          delta = isDebit ? roundedAmount.negated() : roundedAmount;
        }

        const prev = balanceDeltas.get(t.accountId) || new Decimal(0);
        balanceDeltas.set(t.accountId, prev.add(delta));
      }

      // Apply one atomic increment per distinct account
      await Promise.all(
        Array.from(balanceDeltas.entries()).map(([accountId, delta]) =>
          client.account.updateMany({
            where: { id: accountId, tenantId },
            data: { balance: { increment: delta } },
          }),
        ),
      );

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

