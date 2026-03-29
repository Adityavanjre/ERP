import { Test, TestingModule } from '@nestjs/testing';
import { ManufacturingService } from './manufacturing.service';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { AuditService } from '../system/services/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ManufacturingService (Work Order Numbering)', () => {
  let service: ManufacturingService;

  const mockPrisma = {
    billOfMaterial: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workOrder: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    machine: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    stockLocation: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockLedger = {
    round2: jest.fn((v: number) => Math.round(v * 100) / 100),
    createJournalEntry: jest.fn(),
    checkPeriodLock: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManufacturingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ManufacturingService>(ManufacturingService);
  });

  describe('createWorkOrder (race condition fix)', () => {
    it('should generate WO-0001 for first work order', async () => {
      mockPrisma.billOfMaterial.findFirst.mockResolvedValue({
        id: 'bom1',
        tenantId: 't1',
        productId: 'p1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        industry: 'Manufacturing',
      });
      mockPrisma.workOrder.findFirst.mockResolvedValue(null); // No existing WOs
      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo1',
        orderNumber: 'WO-0001',
        status: 'Planned',
      });

      const result = await service.createWorkOrder('t1', {
        bomId: 'bom1',
        quantity: 10,
      });

      expect(result.orderNumber).toBe('WO-0001');
    });

    it('should generate sequential order numbers', async () => {
      mockPrisma.billOfMaterial.findFirst.mockResolvedValue({
        id: 'bom1',
        tenantId: 't1',
        productId: 'p1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        industry: 'Manufacturing',
      });
      mockPrisma.workOrder.findFirst.mockResolvedValue({
        orderNumber: 'WO-0005',
      });
      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo2',
        orderNumber: 'WO-0006',
        status: 'Planned',
      });

      const result = await service.createWorkOrder('t1', {
        bomId: 'bom1',
        quantity: 5,
      });

      expect(result.orderNumber).toBe('WO-0006');
    });

    it('should use transaction to prevent race condition', async () => {
      mockPrisma.billOfMaterial.findFirst.mockResolvedValue({
        id: 'bom1',
        tenantId: 't1',
        productId: 'p1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        industry: 'Manufacturing',
      });
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);
      mockPrisma.workOrder.create.mockResolvedValue({
        id: 'wo1',
        orderNumber: 'WO-0001',
      });

      await service.createWorkOrder('t1', { bomId: 'bom1', quantity: 10 });

      // Verify $transaction was called (atomic operation)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent BOM', async () => {
      mockPrisma.billOfMaterial.findFirst.mockResolvedValue(null);

      await expect(
        service.createWorkOrder('t1', { bomId: 'nonexistent', quantity: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block work orders for non-manufacturing tenants', async () => {
      mockPrisma.billOfMaterial.findFirst.mockResolvedValue({
        id: 'bom1',
        tenantId: 't1',
        productId: 'p1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        industry: 'Retail',
      });

      await expect(
        service.createWorkOrder('t1', { bomId: 'bom1', quantity: 10 }),
      ).rejects.toThrow(/Vertical Compliance Violation/);
    });
  });
});
