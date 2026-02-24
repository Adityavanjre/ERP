
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovementType } from '@prisma/client';
import { AccountingService } from '../accounting/accounting.service';
import { AccountSelectors, StandardAccounts } from '../accounting/constants/account-names';
import { Decimal } from '@prisma/client/runtime/library';
import { TraceService } from '../common/services/trace.service';

@Injectable()
export class WarehouseService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private readonly traceService: TraceService,
  ) { }

  async createWarehouse(tenantId: string, data: any) {
    return this.prisma.warehouse.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async getWarehouses(tenantId: string) {
    return this.prisma.warehouse.findMany({
      where: { tenantId },
      include: {
        stocks: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async updateWarehouse(tenantId: string, id: string, data: any) {
    return this.prisma.warehouse.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async logMovement(tenantId: string, data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    type: MovementType;
    reference?: string;
    notes?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 0. Period Lock Check
      await this.accounting.checkPeriodLock(tenantId, new Date(), tx);

      // 1. Verify existence and ownership
      const [warehouse, product] = await Promise.all([
        tx.warehouse.findFirst({ where: { id: data.warehouseId, tenantId } }),
        tx.product.findFirst({ where: { id: data.productId, tenantId } }),
      ]);

      if (!warehouse || !product) {
        throw new NotFoundException('Warehouse or Product not found in this tenant context.');
      }

      // 2. Log the movement
      const movement = await tx.stockMovement.create({
        data: {
          ...data,
          tenantId,
          correlationId: this.traceService.getCorrelationId(),
        },
      });

      // 2. Update stock location
      const stockLoc = await tx.stockLocation.upsert({
        where: {
          tenantId_productId_warehouseId_notes: {
            tenantId,
            productId: data.productId,
            warehouseId: data.warehouseId,
            notes: data.notes || '',
          },
        },
        create: {
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
          notes: data.notes || '',
        },
        update: {
          quantity: {
            [data.type === MovementType.IN ? 'increment' : 'decrement']: data.quantity,
          },
        },
      });

      // 3. Update global product stock cache
      await tx.product.updateMany({
        where: { id: data.productId, tenantId },
        data: {
          stock: {
            [data.type === MovementType.IN ? 'increment' : 'decrement']: data.quantity,
          },
        },
      });

      // 4. LEDGER SYNC: If not part of a PO or Invoice, post an adjustment journal
      if (!data.reference || (!data.reference.startsWith('INV-') && !data.reference.startsWith('PO-') && !data.reference.startsWith('WO-'))) {
        const isOB = data.reference?.startsWith('OB-') || data.reference?.startsWith('OPENING-');

        const invAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.INVENTORY } }
        });

        const adjAccountName = isOB ? StandardAccounts.OPENING_BALANCE_EQUITY : StandardAccounts.INVENTORY_ADJUSTMENT;
        const adjAccount = await tx.account.findFirst({
          where: { tenantId, name: adjAccountName }
        });

        if (invAccount && adjAccount) {
          const movementValue = new Decimal(product.costPrice as any).mul(new Decimal(data.quantity));
          const isEntry = data.type === MovementType.IN;

          await this.accounting.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `${isOB ? 'Opening Stock' : 'Manual Movement'}: ${product.name} (${data.notes || 'No notes'})`,
            reference: data.reference || `WH-MOV-${movement.id.slice(0, 8)}`,
            transactions: [
              {
                accountId: invAccount.id,
                type: isEntry ? 'Debit' : 'Credit',
                amount: movementValue.toNumber(),
                description: `Warehouse Adjustment: ${data.type}`
              },
              {
                accountId: adjAccount.id,
                type: isEntry ? 'Credit' : 'Debit',
                amount: movementValue.toNumber(),
                description: `Warehouse Adjustment: ${data.type}`
              }
            ]
          }, tx);
        }
      }

      return movement;
    });
  }

  async logOpeningBalance(tenantId: string, data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unitCost?: number;
    notes?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 0. Period Lock Check (Usually opening balances are in the past, but we check anyway)
      await this.accounting.checkPeriodLock(tenantId, new Date(), tx);

      const [warehouse, product] = await Promise.all([
        tx.warehouse.findFirst({ where: { id: data.warehouseId, tenantId } }),
        tx.product.findFirst({ where: { id: data.productId, tenantId } }),
      ]);

      if (!warehouse || !product) {
        throw new NotFoundException('Warehouse or Product not found.');
      }

      const cost = data.unitCost || Number(product.costPrice) || 0;

      // 1. Log the movement as an 'IN' type
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
          type: MovementType.IN,
          reference: 'OPENING-BALANCE',
          notes: data.notes || 'Initial opening balance',
          correlationId: this.traceService.getCorrelationId(),
        },
      });

      // 2. Update stock location
      await tx.stockLocation.upsert({
        where: {
          tenantId_productId_warehouseId_notes: {
            tenantId,
            productId: data.productId,
            warehouseId: data.warehouseId,
            notes: data.notes || '',
          },
        },
        create: {
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
          notes: data.notes || '',
        },
        update: {
          quantity: { increment: data.quantity },
        },
      });

      // 3. Update global product stock cache
      await tx.product.updateMany({
        where: { id: data.productId, tenantId },
        data: { stock: { increment: data.quantity } },
      });

      // 4. LEDGER SYNC: Opening Balance Asset vs Opening Balance Equity
      const invAccount = await tx.account.findFirst({
        where: { tenantId, name: { in: AccountSelectors.INVENTORY } }
      });
      const equityAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY }
      });

      if (invAccount && equityAccount && cost > 0) {
        const totalValue = new Decimal(cost).mul(new Decimal(data.quantity));
        await this.accounting.ledger.createJournalEntry(tenantId, {
          date: new Date().toISOString(),
          description: `Opening Stock: ${product.name} @ ${cost}`,
          reference: `OB-${product.sku}`,
          transactions: [
            { accountId: invAccount.id, type: 'Debit', amount: totalValue.toNumber(), description: `Opening Stock Entry` },
            { accountId: equityAccount.id, type: 'Credit', amount: totalValue.toNumber(), description: `Opening Stock Entry` }
          ]
        }, tx);
      }

      return { success: true };
    });
  }

  async transferStock(tenantId: string, data: {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    notes?: string;
  }) {
    const qty = data.quantity;
    if (qty <= 0) throw new Error('Transfer quantity must be positive');

    return this.prisma.$transaction(async (tx) => {
      // 0. Period Lock Check
      await this.accounting.checkPeriodLock(tenantId, new Date(), tx);

      // 1. Verify existence
      const [fromWH, toWH, product] = await Promise.all([
        tx.warehouse.findFirst({ where: { id: data.fromWarehouseId, tenantId } }),
        tx.warehouse.findFirst({ where: { id: data.toWarehouseId, tenantId } }),
        tx.product.findFirst({ where: { id: data.productId, tenantId } }),
      ]);

      if (!fromWH || !toWH || !product) throw new NotFoundException('Warehouse or Product not found');

      // 2. Logic: Decrement From
      const fromLoc = await tx.stockLocation.findUnique({
        where: {
          tenantId_productId_warehouseId_notes: {
            tenantId,
            productId: data.productId,
            warehouseId: data.fromWarehouseId,
            notes: '' // Assuming transfer from main stock
          }
        }
      });
      if (!fromLoc || fromLoc.quantity.lt(qty)) {
        throw new Error(`Insufficient stock in warehouse ${fromWH.name}`);
      }

      await tx.stockLocation.updateMany({
        where: { id: fromLoc.id, warehouse: { tenantId } },
        data: { quantity: { decrement: qty } }
      });

      // 3. Logic: Increment To
      await tx.stockLocation.upsert({
        where: {
          tenantId_productId_warehouseId_notes: {
            tenantId,
            productId: data.productId,
            warehouseId: data.toWarehouseId,
            notes: ''
          }
        },
        create: {
          tenantId,
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          quantity: qty,
          notes: ''
        },
        update: { quantity: { increment: qty } }
      });

      // 4. Movement Logs
      const reference = `TRF-${Date.now()}`;
      await tx.stockMovement.createMany({
        data: [
          {
            tenantId,
            productId: data.productId,
            warehouseId: data.fromWarehouseId,
            quantity: qty,
            type: MovementType.OUT,
            reference,
            notes: `Transfer to ${toWH.name}. ${data.notes || ''}`,
            correlationId: this.traceService.getCorrelationId(),
          },
          {
            tenantId,
            productId: data.productId,
            warehouseId: data.toWarehouseId,
            quantity: qty,
            type: MovementType.IN,
            reference,
            notes: `Transfer from ${fromWH.name}. ${data.notes || ''}`,
            correlationId: this.traceService.getCorrelationId(),
          }
        ]
      });

      return { success: true, reference };
    });
  }
}
