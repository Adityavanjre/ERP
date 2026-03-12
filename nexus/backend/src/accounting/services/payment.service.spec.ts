import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TdsService } from './tds.service';
import { TraceService } from '../../common/services/trace.service';

describe('PaymentService (Integrity)', () => {
  let service: PaymentService;
  let prisma: PrismaService;

  const mockPrisma = {
    payment: { findFirst: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  } as any;

  const mockLedger = {
    checkPeriodLock: jest.fn(),
  };

  const mockTds = {
    calculateTds: jest.fn(),
    recordTdsTransaction: jest.fn(),
  };

  const mockTrace = {
    getCorrelationId: jest.fn().mockReturnValue('test-trace-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
        { provide: TdsService, useValue: mockTds },
        { provide: TraceService, useValue: mockTrace },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should block direct updates to amount', async () => {
    const existingPayment = {
      id: 'p1',
      amount: new Decimal(100),
      date: new Date('2024-01-01'),
      tenantId: 't1',
    };
    mockPrisma.payment.findFirst.mockResolvedValue(existingPayment);

    await expect(
      service.updatePayment('t1', 'p1', { amount: 200 }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updatePayment('t1', 'p1', { amount: 200 }),
    ).rejects.toThrow(/Financial Integrity Violation/);
  });

  it('should block direct updates to date', async () => {
    const existingPayment = { id: 'p1', date: new Date('2024-01-01') };
    mockPrisma.payment.findFirst.mockResolvedValue(existingPayment);

    await expect(
      service.updatePayment('t1', 'p1', { date: new Date('2024-02-01') }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow updates to non-financial fields like notes', async () => {
    const existingPayment = { id: 'p1', notes: 'Old note', date: new Date() };
    mockPrisma.payment.findFirst.mockResolvedValue(existingPayment);
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.updatePayment('t1', 'p1', {
      notes: 'New note',
    });
    expect(result).toBeDefined();
    expect(mockPrisma.payment.updateMany).toHaveBeenCalled();
  });
});
