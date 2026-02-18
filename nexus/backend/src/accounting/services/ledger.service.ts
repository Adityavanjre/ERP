import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, TransactionType } from '@prisma/client';
import { CreateJournalEntryDto } from '../dto/create-journal.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LedgerService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {}

  round2(val: number | string | Decimal): Decimal {
    if (val instanceof Decimal) {
      return val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
    return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
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
    return this.prisma.account.create({
      data: { ...data, tenantId },
    });
  }

  async getAccounts(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async initializeTenantAccounts(tenantId: string, tx?: any) {
    const client = tx || this.prisma;
    const defaults = [
      { name: 'Accounts Receivable', type: AccountType.Asset, code: '1001' },
      { name: 'Bank', type: AccountType.Asset, code: '1002' },
      { name: 'Cash', type: AccountType.Asset, code: '1003' },
      { name: 'Inventory', type: AccountType.Asset, code: '1004' },
      { name: 'Accounts Payable', type: AccountType.Liability, code: '2001' },
      { name: 'GST Payable', type: AccountType.Liability, code: '2002' },
      { name: 'Sales', type: AccountType.Revenue, code: '3001' },
      { name: 'Cost of Goods Sold', type: AccountType.Expense, code: '4001' },
      { name: 'Rent Expense', type: AccountType.Expense, code: '4002' },
      { name: 'Depreciation Expense', type: AccountType.Expense, code: '4003' },
      { name: 'Retained Earnings', type: AccountType.Equity, code: '5001' },
      { name: 'Fixed Assets', type: AccountType.Asset, code: '1101' },
      { name: 'Accumulated Depreciation', type: AccountType.Asset, code: '1102' },
    ];

    for (const acc of defaults) {
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

  async createJournalEntry(tenantId: string, data: CreateJournalEntryDto, tx?: any) {
    const totalDebit = data.transactions
      .filter((t) => t.type === 'Debit')
      .reduce((sum, t) => sum.add(new Decimal(t.amount)), new Decimal(0))
      .toDecimalPlaces(2);

    const totalCredit = data.transactions
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum.add(new Decimal(t.amount)), new Decimal(0))
      .toDecimalPlaces(2);

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Journal entry must balance exactly. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    const execute = async (client: any) => {
      await this.checkPeriodLock(tenantId, data.date || new Date(), client);

      const journal = await client.journalEntry.create({
        data: {
          tenantId,
          date: new Date(data.date),
          description: data.description,
          reference: data.reference,
          posted: true,
        },
      });

      for (const t of data.transactions) {
        await client.transaction.create({
          data: {
            tenantId,
            accountId: t.accountId,
            amount: t.amount,
            type: t.type,
            description: t.description || data.description, // Use t.description if available
            journalEntryId: journal.id,
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
