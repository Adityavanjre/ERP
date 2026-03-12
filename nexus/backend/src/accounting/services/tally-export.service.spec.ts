import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { TallyService } from './tally-export.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { POStatus, InvoiceStatus, AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('TallyService (XML & Data Bridge)', () => {
  let service: TallyService;
  let prisma: PrismaService;
  let mockPrisma: any;
  let mockLedger: any;

  beforeEach(async () => {
    mockPrisma = {
      tenant: {
        findUnique: (jest.fn() as any).mockResolvedValue({
          id: 't1',
          state: 'MH',
        }),
      },
      invoice: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        aggregate: jest.fn(),
      },
      purchaseOrder: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      payment: { findMany: jest.fn() },
      account: { findMany: jest.fn() },
      customer: { findMany: jest.fn() },
      supplier: { findMany: jest.fn() },
      product: { findMany: jest.fn(), count: jest.fn() },
      auditLog: { findMany: jest.fn() },
      periodLock: { findUnique: jest.fn() },
      creditNote: { findMany: (jest.fn() as any).mockResolvedValue([]) },
      debitNote: { findMany: (jest.fn() as any).mockResolvedValue([]) },
      workOrder: { findMany: (jest.fn() as any).mockResolvedValue([]) },
    };

    mockLedger = {
      round2: jest.fn((n: Decimal) => new Decimal(n.toFixed(2))),
      checkPeriodLock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
        {
          provide: 'CACHE_MANAGER',
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TallyService>(TallyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('XML Protection', () => {
    it('should escape special characters to prevent Tally import errors', () => {
      // @ts-ignore - accessing private method for test
      const result = (service as any).escapeXml('Sales & Services "Premium"');
      expect(result).toBe('Sales &amp; Services &quot;Premium&quot;');
    });
  });

  describe('Voucher Export Logic', () => {
    it('should generate Receipt XML for customer payments', async () => {
      const mockPayments = [
        {
          id: 'pay1',
          date: new Date('2024-01-01'),
          amount: new Decimal(5000),
          mode: 'Bank',
          reference: 'RX-123',
          customerId: 'cust1',
          customer: { company: 'ACME Corp' },
          totalTaxable: new Decimal(5000),
          totalGST: new Decimal(0),
          totalAmount: new Decimal(5000),
          totalCGST: new Decimal(0),
          totalSGST: new Decimal(0),
          totalIGST: new Decimal(0),
        },
      ];

      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValue([]);

      const xml = await service.exportTallyXml('t1', 1, 2024);

      expect(xml).toContain('<VOUCHER VCHTYPE="Receipt" ACTION="Create">');
      expect(xml).toContain('<PARTYLEDGERNAME>ACME Corp</PARTYLEDGERNAME>');
      expect(xml).toContain('<AMOUNT>-5000</AMOUNT>'); // Dr Bank (Negative in Tally XML for Receipt)
    });

    it('should generate Payment XML for supplier payments', async () => {
      const mockPayments = [
        {
          id: 'pay2',
          date: new Date('2024-01-02'),
          amount: new Decimal(3000),
          mode: 'Cash',
          reference: 'VND-456',
          supplierId: 'supp1',
          supplier: { name: 'Raw Co' },
          totalTaxable: new Decimal(3000),
          totalGST: new Decimal(0),
          totalAmount: new Decimal(3000),
          totalCGST: new Decimal(0),
          totalSGST: new Decimal(0),
          totalIGST: new Decimal(0),
        },
      ];

      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValue([]);

      const xml = await service.exportTallyXml('t1', 1, 2024);

      expect(xml).toContain('<VOUCHER VCHTYPE="Payment" ACTION="Create">');
      expect(xml).toContain('<PARTYLEDGERNAME>Raw Co</PARTYLEDGERNAME>');
      expect(xml).toContain('<AMOUNT>3000</AMOUNT>'); // Dr Supplier (Positive in Tally XML for Payment)
    });
  });

  describe('Validation & Confidence Scoring', () => {
    it('should flags backdated invoices', async () => {
      const mockInvoices = [
        {
          id: 'inv1',
          invoiceNumber: 'INV-001',
          issueDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-05'), // 4 days later
          items: [],
          totalTaxable: new Decimal(0),
          totalGST: new Decimal(0),
          totalAmount: new Decimal(0),
          totalCGST: new Decimal(0),
          totalSGST: new Decimal(0),
          totalIGST: new Decimal(0),
        },
      ];

      mockPrisma.invoice.findMany
        .mockResolvedValueOnce(mockInvoices)
        .mockResolvedValue([]);
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const result = await service.validateTallyData('t1', 1, 2024);
      const backdatedRisk = result.riskFlags.find(
        (f: any) => f.type === 'BACKDATED',
      );
      expect(backdatedRisk).toBeDefined();
    });

    it('should penalize confidence score for negative stock', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(2); // 2 products with negative stock

      const result = await service.validateTallyData('t1', 1, 2024);
      expect(result.confidenceScore).toBeLessThan(100);
      expect(
        result.riskFlags.some((f: any) => f.type === 'NEGATIVE_STOCK'),
      ).toBe(true);
    });
  });
});
