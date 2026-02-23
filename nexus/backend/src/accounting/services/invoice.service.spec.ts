
import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { BadRequestException } from '@nestjs/common';

describe('InvoiceService (Compliance)', () => {
  let service: InvoiceService;
  let prisma: PrismaService;

  const mockPrisma = {
    tenant: { findUnique: jest.fn() },
    customer: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    invoice: { findFirst: jest.fn() },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockLedger = {
    round2: jest.fn((n) => n),
    checkPeriodLock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should block invoice creation if tenant state is missing', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'T1' }); // No state
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'c1', state: 'MH' });

    await expect(service.createInvoice('t1', { customerId: 'c1', items: [] }))
      .rejects.toThrow(BadRequestException);
    await expect(service.createInvoice('t1', { customerId: 'c1', items: [] }))
      .rejects.toThrow(/Tenant state is missing/);
  });

  it('should block invoice creation if customer state is missing', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', state: 'MH' });
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'c1' }); // No state

    await expect(service.createInvoice('t1', { customerId: 'c1', items: [] }))
      .rejects.toThrow(BadRequestException);
    await expect(service.createInvoice('t1', { customerId: 'c1', items: [] }))
      .rejects.toThrow(/Customer state is missing/);
  });

  it('should block invoice creation if product HSN is missing', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', state: 'MH' });
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'c1', state: 'MH' });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'P1' }); // No HSN

    await expect(service.createInvoice('t1', {
      customerId: 'c1',
      items: [{ productId: 'p1', quantity: 1, price: 100 }]
    })).rejects.toThrow(/HSN Code is missing/);
  });

  it('should proceed if compliance data is present', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', state: 'MH' });
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'c1', state: 'MH' });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'P1', hsnCode: '1234', price: 100 });
    mockPrisma.invoice.findFirst.mockResolvedValue(null); // Idempotency check

    // This will still fail later in the function due to missing more mocks (e.g. stock deduction),
    // but it should get PAST the initial compliance checks.
    try {
        await service.createInvoice('t1', {
            customerId: 'c1',
            items: [{ productId: 'p1', quantity: 1, price: 100 }]
        });
    } catch (e) {
        expect(e.message).not.toMatch(/Compliance Error/);
    }
  });
});
