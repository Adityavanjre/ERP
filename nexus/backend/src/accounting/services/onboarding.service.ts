import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType } from '@prisma/client';
import { StandardAccounts } from '../constants/account-names';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

  /**
   * Trial Balance Importer (The CA Onboarding Special)
   * Allows importing current balances of all ledgers during migration.
   */
  async importTrialBalance(tenantId: string, csvContent: string) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    const results = {
      total: lines.length - 1,
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    return this.prisma.$transaction(async (tx) => {
      const obAcc = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY },
      });
      if (!obAcc)
        throw new BadRequestException(
          'Onboarding Blocked: Opening Balance Equity account missing.',
        );

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',').map((c) => c.trim());
        const data: any = {};
        headers.forEach((h, idx) => {
          data[h] = cols[idx];
        });

        const name = data.accountName || data.name;
        const type = (data.type as AccountType) || AccountType.Asset;
        const ob = parseFloat(data.openingBalance || data.balance || '0');

        if (!name)
          throw new BadRequestException(
            `Line ${i}: Account Name is required for import.`,
          );
        if (ob === 0) continue; // Skip zero balances

        let account = await tx.account.findFirst({ where: { tenantId, name } });
        if (!account) {
          account = await tx.account.create({
            data: {
              tenantId,
              name,
              type,
              code: data.code || `OB-${Date.now().toString().slice(-6)}`,
              balance: 0,
            },
          });
        }

        // Check if an OB journal already exists for this account to prevent double-entry on re-import
        const existingJournal = await tx.journalEntry.findFirst({
          where: {
            tenantId,
            reference: `OB-${account.code}`,
            description: { contains: 'Opening Balance' },
          },
        });

        if (!existingJournal) {
          const amount = new Decimal(ob);
          const isDebitNormal = [
            AccountType.Asset,
            AccountType.Expense,
          ].includes(account.type as any);
          const entryType = isDebitNormal
            ? amount.isPositive()
              ? 'Debit'
              : 'Credit'
            : amount.isPositive()
              ? 'Credit'
              : 'Debit';

          await this.ledger.createJournalEntry(
            tenantId,
            {
              date: new Date().toISOString(),
              description: `Opening Balance: ${account.name}`,
              reference: `OB-${account.code}`,
              transactions: [
                {
                  accountId: account.id,
                  type: entryType as any,
                  amount: amount.abs().toNumber(),
                  description: 'Trial Balance Migration',
                },
                {
                  accountId: obAcc.id,
                  type: (entryType === 'Debit' ? 'Credit' : 'Debit') as any,
                  amount: amount.abs().toNumber(),
                  description: 'Offsetting Equity',
                },
              ],
            },
            tx,
          );
          results.imported++;
        }
      }
      return results;
    });
  }
}
