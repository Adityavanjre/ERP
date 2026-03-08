import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { HsnService } from '../../inventory/services/hsn.service';
import { TraceService } from '../../common/services/trace.service';
import { BillingService } from '../../system/services/billing.service';
import { InventoryService } from '../../inventory/inventory.service';
import { NotFoundException } from '@nestjs/common';

describe('TEN-001: IDOR Isolation Audit (Unit Tests)', () => {
  let service: InvoiceService;
  let prisma: PrismaService;

  const mockPrisma = {
    invoice: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: {} },
        { provide: HsnService, useValue: {} },
        { provide: TraceService, useValue: {} },
        { provide: BillingService, useValue: {} },
        { provide: InventoryService, useValue: {} },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('InvoiceService.findOne', () => {
    it('should include tenantId in the query for findOne', async () => {
      const tenantId = 'tenant-123';
      const invoiceId = 'inv-456';

      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
      });

      await service.findOne(tenantId, invoiceId);

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: invoiceId, tenantId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if invoice belongs to another tenant', async () => {
      const myTenantId = 'tenant-MINE';
      const otherInvoiceId = 'inv-OTHERS';

      // Simulate Prisma returning null because of the tenantId filter
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne(myTenantId, otherInvoiceId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: otherInvoiceId, tenantId: myTenantId },
        }),
      );
    });
  });
});
