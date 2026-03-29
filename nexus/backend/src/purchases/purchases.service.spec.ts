import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { TdsService } from '../accounting/services/tds.service';
import { TraceService } from '../common/services/trace.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validateGSTIN } from '../common/utils/gst-validation.util';

describe('PurchasesService (Supplier & PO)', () => {
  let service: PurchasesService;

  const mockPrisma = {
    supplier: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    purchaseOrder: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    purchaseOrderItem: {
      create: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    supplierOpeningBalance: {
      create: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockAccounting = { ledger: { checkPeriodLock: jest.fn() } };
  const mockLedger = {
    round2: jest.fn((v: number) => Math.round(v * 100) / 100),
    createJournalEntry: jest.fn(),
    checkPeriodLock: jest.fn(),
  };
  const mockTds = { calculateTds: jest.fn() };
  const mockTrace = { getCorrelationId: jest.fn().returns('trace-id') };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountingService, useValue: mockAccounting },
        { provide: LedgerService, useValue: mockLedger },
        { provide: TdsService, useValue: mockTds },
        { provide: TraceService, useValue: mockTrace },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
  });

  describe('GSTIN Validation', () => {
    it('should accept valid GSTIN', () => {
      expect(validateGSTIN('29ABCDE1234F1Z5')).toBe(true);
    });

    it('should reject GSTIN with wrong length', () => {
      expect(validateGSTIN('29ABCDE1234F1Z')).toBe(false);
      expect(validateGSTIN('')).toBe(false);
    });

    it('should reject GSTIN with invalid format', () => {
      expect(validateGSTIN('abcdefghijklmno')).toBe(false);
    });

    it('should reject GSTIN with invalid checksum', () => {
      // Valid format but wrong checksum
      expect(validateGSTIN('29ABCDE1234F1Z0')).toBe(false);
    });
  });

  describe('createSupplier', () => {
    it('should create supplier with valid data', async () => {
      mockPrisma.supplier.create.mockResolvedValue({
        id: 's1',
        name: 'Test Supplier',
        email: 'test@supplier.com',
        gstin: null,
      });

      const result = await service.createSupplier('t1', {
        name: 'Test Supplier',
        email: 'test@supplier.com',
      });

      expect(result.id).toBe('s1');
      expect(mockPrisma.supplier.create).toHaveBeenCalled();
    });

    it('should reject invalid GSTIN on supplier creation', async () => {
      await expect(
        service.createSupplier('t1', {
          name: 'Test Supplier',
          email: 'test@supplier.com',
          gstin: 'INVALID_GSTIN',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce gstMandatory when tenant has it enabled', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        gstMandatory: true,
      });

      await expect(
        service.createSupplier('t1', {
          name: 'Test Supplier',
          email: 'test@supplier.com',
          // No GSTIN provided
        }),
      ).rejects.toThrow(/GSTIN is required/);
    });

    it('should allow supplier without GSTIN when gstMandatory is false', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        gstMandatory: false,
      });
      mockPrisma.supplier.create.mockResolvedValue({
        id: 's1',
        name: 'Test Supplier',
      });

      const result = await service.createSupplier('t1', {
        name: 'Test Supplier',
        email: 'test@supplier.com',
      });

      expect(result.id).toBe('s1');
    });
  });

  describe('deleteSupplier', () => {
    it('should soft-delete supplier', async () => {
      mockPrisma.supplier.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteSupplier('t1', 's1');

      expect(mockPrisma.supplier.updateMany).toHaveBeenCalledWith({
        where: { id: 's1', tenantId: 't1' },
        data: { isDeleted: true },
      });
    });
  });
});
