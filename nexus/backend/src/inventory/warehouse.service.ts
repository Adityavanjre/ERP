
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovementType } from '@prisma/client';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

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

  async logMovement(tenantId: string, data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    type: MovementType;
    reference?: string;
    notes?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
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
        },
      });

      // 2. Update stock location
      const stockLoc = await tx.stockLocation.upsert({
        where: {
          productId_warehouseId: {
            productId: data.productId,
            warehouseId: data.warehouseId,
          },
        },
        create: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
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

      return movement;
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
      // 1. Verify existence
      const [fromWH, toWH, product] = await Promise.all([
        tx.warehouse.findFirst({ where: { id: data.fromWarehouseId, tenantId } }),
        tx.warehouse.findFirst({ where: { id: data.toWarehouseId, tenantId } }),
        tx.product.findFirst({ where: { id: data.productId, tenantId } }),
      ]);

      if (!fromWH || !toWH || !product) throw new NotFoundException('Warehouse or Product not found');

      // 2. Logic: Decrement From
      const fromLoc = await tx.stockLocation.findUnique({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.fromWarehouseId } }
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
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.toWarehouseId } },
        create: {
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          quantity: qty
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
            notes: `Transfer to ${toWH.name}. ${data.notes || ''}`
          },
          {
            tenantId,
            productId: data.productId,
            warehouseId: data.toWarehouseId,
            quantity: qty,
            type: MovementType.IN,
            reference,
            notes: `Transfer from ${fromWH.name}. ${data.notes || ''}`
          }
        ]
      });

      return { success: true, reference };
    });
  }
}
