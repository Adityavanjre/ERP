
import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TraceService } from '../../common/services/trace.service';
import { BillingService } from '../../system/services/billing.service';

describe('LedgerService (Financial Integrity)', () => {
  let service: LedgerService;
  let prisma: PrismaService;

  const mockPrisma = {
    periodLock: {
      findUnique: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    journalEntry: {
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockTrace = {
    getCorrelationId: jest.fn().mockReturnValue('test-trace-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TraceService, useValue: mockTrace },
        {
          provide: BillingService,
          useValue: {
            getPlanByTenant: jest.fn().mockResolvedValue('Enterprise'),
            checkQuota: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Double Entry Integrity', () => {
    it('should block journal entries where Dr != Cr', async () => {
      const imbalancedEntry = {
        date: new Date().toISOString(),
        description: 'Test Imbalance',
        transactions: [
          { accountId: 'a1', type: 'Debit', amount: 100 },
          { accountId: 'a2', type: 'Credit', amount: 90 }, // Missing 10
        ],
      };

      await expect(service.createJournalEntry('t1', imbalancedEntry as any))
        .rejects.toThrow(BadRequestException);
      await expect(service.createJournalEntry('t1', imbalancedEntry as any))
        .rejects.toThrow(/Journal entry must balance exactly/);
    });

    it('should allow entries where Dr == Cr', async () => {
      const balancedEntry = {
        date: new Date().toISOString(),
        description: 'Test Balance',
        transactions: [
          { accountId: 'a1', type: 'Debit', amount: 100 },
          { accountId: 'a2', type: 'Credit', amount: 100 },
        ],
      };

      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'j1' });
      mockPrisma.transaction.create.mockResolvedValue({ id: 't-tx-1' });
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'a-1', name: 'Test Account' });
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'a1', type: 'Asset' },
        { id: 'a2', type: 'Liability' }
      ]);
      mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.periodLock.findUnique.mockResolvedValue(null); // Not locked

      const result = await service.createJournalEntry('t1', balancedEntry as any);
      expect(result).toBeDefined();
    });
  });

  describe('Period Lock Enforcement', () => {
    it('should block writes to a locked period', async () => {
      const lockDate = new Date('2024-01-15');
      mockPrisma.periodLock.findUnique.mockResolvedValue({ isLocked: true });

      await expect(service.checkPeriodLock('t1', lockDate))
        .rejects.toThrow(BadRequestException);
      await expect(service.checkPeriodLock('t1', lockDate))
        .rejects.toThrow(/locked for Audit/);
    });

    it('should allow writes to an unlocked period', async () => {
      const lockDate = new Date('2024-01-15');
      mockPrisma.periodLock.findUnique.mockResolvedValue({ isLocked: false });

      await expect(service.checkPeriodLock('t1', lockDate))
        .resolves.not.toThrow();
    });
  });

  describe('Deterministic Rounding', () => {
    it('should round correctly to 2 decimal places (Standard INR)', () => {
      expect(service.round2(100.456).toNumber()).toBe(100.46);
      expect(service.round2(100.454).toNumber()).toBe(100.45);
      expect(service.round2(new Decimal(100.455)).toNumber()).toBe(100.46);
    });
  });
});
