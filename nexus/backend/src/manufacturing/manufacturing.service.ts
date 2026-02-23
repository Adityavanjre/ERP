import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountSelectors, StandardAccounts } from '../accounting/constants/account-names';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class ManufacturingService {
  private readonly logger = new Logger(ManufacturingService.name);

  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
  ) { }

  /**
   * Explodes a Bill of Materials recursively to find total raw material requirements.
   */
  async explodeBOM(tenantId: string, bomId: string, multiplier: number = 1, depth: number = 0) {
    if (depth > 10) {
      throw new BadRequestException(`Production Audit Error: Circular dependency or excessive BOM depth detected at ID ${bomId}. Maximum depth is 10.`);
    }

    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id: bomId, tenantId },
      include: { items: { include: { product: true } } },
    });

    if (!bom) throw new NotFoundException('BOM not found');

    let requirements: any[] = [];

    for (const item of bom.items) {
      const totalQty = new Decimal(item.quantity).mul(multiplier);

      // Check if this component has its own BOM (Recursive)
      const subBOM = await this.prisma.billOfMaterial.findFirst({
        where: { productId: item.productId, tenantId, status: 'Active' },
      });

      if (subBOM) {
        const subRequirements = await this.explodeBOM(tenantId, subBOM.id, totalQty.toNumber(), depth + 1);
        requirements = [...requirements, ...subRequirements];
      } else {
        requirements.push({
          productId: item.productId,
          productName: item.product.name,
          quantity: totalQty,
          unit: item.unit,
          costPrice: new Decimal(item.product.costPrice || 0),
        });
      }
    }

    return this.aggregateRequirements(requirements);
  }

  // BOM Management
  async createBOM(tenantId: string, data: any) {
    return this.prisma.billOfMaterial.create({
      data: {
        tenantId,
        name: data.name,
        productId: data.productId,
        quantity: data.quantity,
        overheadRate: new Decimal(data.overheadRate || 0),
        isOverheadFixed: data.isOverheadFixed || false,
        items: {
          create: data.items.map((item: any) => ({
            tenantId,
            productId: item.productId,
            quantity: new Decimal(item.quantity),
            unit: item.unit,
            isByproduct: item.isByproduct || false,
          })),
        },
      },
      include: { items: true },
    });
  }

  async getBOMs(tenantId: string) {
    return this.prisma.billOfMaterial.findMany({
      where: { tenantId },
      include: { product: true, items: { include: { product: true } } },
    });
  }

  async getBOMDetails(tenantId: string, bomId: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id: bomId, tenantId },
      include: { product: true },
    });
    if (!bom) throw new NotFoundException('BOM not found');

    const items = await this.prisma.bOMItem.findMany({
      where: { bomId, bom: { tenantId } },
      include: { product: true },
    });

    return { ...bom, items };
  }

  // Work Order Management
  async getWorkOrders(tenantId: string) {
    return this.prisma.workOrder.findMany({
      where: { tenantId },
      include: { bom: { include: { product: true } } },
    });
  }

  async updateWorkOrderStatus(tenantId: string, id: string, status: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, tenantId },
    });
    if (!wo) throw new NotFoundException('Work Order not found');

    return this.prisma.workOrder.updateMany({
      where: { id, tenantId },
      data: { status: status as any },
    });
  }

  async startWorkOrder(tenantId: string, woId: string, warehouseId?: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: woId, tenantId },
      include: { bom: true }
    });

    if (!wo) throw new NotFoundException('Work Order not found');
    if (wo.status !== 'Planned') throw new BadRequestException(`Cannot start Work Order in ${wo.status} status.`);

    const requirements = await this.explodeBOM(tenantId, wo.bomId, wo.quantity);

    return await this.prisma.$transaction(async (tx) => {
      const idempotencyKey = (arguments[2] as any)?.idempotencyKey; // Or handle via data object
      if (idempotencyKey) {
        const existing = await tx.workOrder.findFirst({ where: { id: woId, tenantId, status: 'InProgress' } });
        if (existing) return { success: true, alreadyStarted: true };
      }

      await this.accounting.ledger.checkPeriodLock(tenantId, new Date(), tx);

      const warehouse = await tx.warehouse.findFirst({
        where: {
          tenantId,
          OR: [
            { name: 'Main Warehouse' },
            {}
          ]
        },
      });
      const targetWarehouse = warehouseId || warehouse?.id;

      if (!targetWarehouse) throw new Error('No valid warehouse found for production storage.');

      for (const req of (requirements as any[])) {
        const loc = await tx.stockLocation.findUnique({
          where: {
            tenantId_productId_warehouseId_notes: {
              tenantId,
              productId: req.productId,
              warehouseId: targetWarehouse,
              notes: ''
            }
          }
        });

        if (!loc || loc.quantity.lessThan(req.quantity)) {
          throw new BadRequestException(`Insufficient stock for ${req.productName}. Required: ${req.quantity}, Available: ${loc?.quantity || 0}`);
        }

        // Move from RM/Normal to WIP
        await tx.stockLocation.update({
          where: { id: loc.id },
          data: { quantity: { decrement: new Decimal(req.quantity) } }
        });

        const wipLoc = await tx.stockLocation.findUnique({
          where: {
            tenantId_productId_warehouseId_notes: {
              tenantId,
              productId: req.productId,
              warehouseId: targetWarehouse,
              notes: 'WIP_BIN'
            }
          }
        });

        if (wipLoc) {
          await tx.stockLocation.update({
            where: { id: wipLoc.id },
            data: { quantity: { increment: new Decimal(req.quantity) } }
          });
        } else {
          await tx.stockLocation.create({
            data: {
              tenantId,
              productId: req.productId,
              warehouseId: targetWarehouse,
              quantity: new Decimal(req.quantity),
              notes: 'WIP_BIN'
            }
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: req.productId,
            warehouseId: targetWarehouse,
            quantity: new Decimal(req.quantity),
            type: 'OUT',
            reference: wo.orderNumber,
            notes: `WIP Issue: Production Start`
          }
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: req.productId,
            warehouseId: targetWarehouse,
            quantity: new Decimal(req.quantity),
            type: 'IN',
            reference: wo.orderNumber,
            notes: `WIP Receipt: Internal Transfer`,
          }
        });
      }

      const wipAccount = await tx.account.findFirst({
        where: { tenantId, name: { in: AccountSelectors.WIP } }
      });
      const rmAccount = await tx.account.findFirst({
        where: { tenantId, name: { in: AccountSelectors.RAW_MATERIALS } }
      });

      if (wipAccount && rmAccount) {
        let totalWipValue = new Decimal(0);
        for (const req of (requirements as any[])) {
          totalWipValue = totalWipValue.add(new Decimal(req.costPrice || 0).mul(req.quantity));
        }

        if (totalWipValue.gt(0)) {
          await this.accounting.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Production Issue (WIP): ${wo.orderNumber}`,
            reference: wo.orderNumber,
            transactions: [
              { accountId: wipAccount.id, type: 'Debit', amount: totalWipValue.toNumber(), description: 'RM to WIP Transfer' },
              { accountId: rmAccount.id, type: 'Credit', amount: totalWipValue.toNumber(), description: 'RM to WIP Transfer' }
            ]
          }, tx);
        }
      }

      await tx.workOrder.update({
        where: { id: woId },
        data: { status: 'InProgress', startDate: new Date() }
      });

      return { success: true, message: 'Production Started: Materials Issued to WIP & Ledger Synced' };
    });
  }

  // Machine Management
  async createMachine(tenantId: string, data: any) {
    return this.prisma.machine.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        type: data.type,
        status: data.status || 'Idle',
      },
    });
  }

  async getMachines(tenantId: string) {
    return this.prisma.machine.findMany({
      where: { tenantId },
    });
  }

  private aggregateRequirements(reqs: any[]) {
    const aggregated = reqs.reduce((acc, curr) => {
      const productId = curr.productId;
      if (!acc[productId]) {
        acc[productId] = { ...curr, quantity: new Decimal(curr.quantity) };
      } else {
        acc[productId].quantity = acc[productId].quantity.add(new Decimal(curr.quantity));
      }
      return acc;
    }, {});

    return Object.values(aggregated).map((r: any) => ({
      ...r,
      quantity: r.quantity.toNumber()
    }));
  }

  async getBOMCost(tenantId: string, bomId: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id: bomId, tenantId },
    });
    if (!bom) throw new NotFoundException('BOM not found');

    const requirements: any[] = await this.explodeBOM(tenantId, bomId, 1);
    let materialCost = new Decimal(0);
    for (const req of requirements) {
      materialCost = materialCost.add(new Decimal(req.costPrice || 0).mul(req.quantity));
    }

    const overheadRate = new Decimal(bom.overheadRate || 0);
    const overheadCost = (bom as any).isOverheadFixed
      ? overheadRate
      : materialCost.mul(overheadRate).div(100);

    return {
      materialCost: materialCost.toDecimalPlaces(2).toNumber(),
      overheadCost: overheadCost.toDecimalPlaces(2).toNumber(),
      totalCost: materialCost.add(overheadCost).toDecimalPlaces(2).toNumber(),
      items: requirements,
    };
  }

  async checkShortages(tenantId: string, bomId: string, quantity: number) {
    const requirements: any[] = await this.explodeBOM(tenantId, bomId, quantity);
    const shortages = [];

    for (const req of requirements) {
      const product = await this.prisma.product.findFirst({
        where: { id: req.productId, tenantId, isDeleted: false },
      });
      const currentStock = Number(product?.stock || 0);
      if (currentStock < req.quantity) {
        shortages.push({
          productId: req.productId,
          productName: req.productName,
          required: req.quantity,
          available: currentStock,
          missing: req.quantity - currentStock,
        });
      }
    }
    return shortages;
  }

  async completeWorkOrder(tenantId: string, woId: string, producedQtyStr?: number | string, scrapQtyStr?: number | string, warehouseId?: string, idempotencyKey?: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: woId, tenantId },
      include: { bom: { include: { product: true } } },
    }) as any;

    if (!wo) throw new NotFoundException('Work Order not found');

    // 1. Idempotency Check
    if (idempotencyKey && wo.idempotencyKey === idempotencyKey && wo.status === 'Completed') {
      return wo.completionLog || { success: true, message: 'Already completed (Idempotent)' };
    }

    if (wo.status === 'Completed')
      throw new BadRequestException('Work Order already completed');

    const producedQty = producedQtyStr !== undefined ? Number(producedQtyStr) : wo.quantity;
    const scrapQty = scrapQtyStr !== undefined ? Number(scrapQtyStr) : 0;

    await this.accounting.checkPeriodLock(tenantId, new Date());

    try {
      // Consume raw materials based on the sum of produced and scrap
      const totalConsumedQty = producedQty + scrapQty;
      const requirements: any[] = await this.explodeBOM(tenantId, wo.bomId, totalConsumedQty > 0 ? totalConsumedQty : wo.quantity);

      return await this.prisma.$transaction(async (tx) => {
        const targetWarehouse = warehouseId || (await tx.warehouse.findFirst({
          where: { tenantId },
          orderBy: { id: 'asc' }
        }))?.id;

        if (!targetWarehouse) throw new Error('No valid warehouse found for production storage.');

        for (const req of (requirements as any[])) {
          const isFromWIP = wo.status === 'InProgress';

          if (isFromWIP) {
            // Consume from WIP Bin
            const wipLoc = await tx.stockLocation.findFirst({
              where: { productId: req.productId, warehouseId: targetWarehouse, notes: 'WIP_BIN' }
            });
            if (!wipLoc || wipLoc.quantity.lessThan(req.quantity)) {
              throw new BadRequestException(`WIP inconsistency for ${req.productName}. Please check production floor stock.`);
            }
            await tx.stockLocation.update({
              where: { id: wipLoc.id },
              data: { quantity: { decrement: new Decimal(req.quantity) } }
            });
          } else {
            // Direct consumption from Store
            const loc = await tx.stockLocation.findFirst({
              where: { productId: req.productId, warehouseId: targetWarehouse, notes: null }
            });

            if (!loc || loc.quantity.lessThan(req.quantity)) {
              throw new BadRequestException(`Insufficient stock in warehouse for ${req.productName}. Required: ${req.quantity}, Available: ${loc?.quantity || 0}`);
            }

            await tx.stockLocation.update({
              where: { id: loc.id },
              data: { quantity: { decrement: new Decimal(req.quantity) } }
            });
          }

          // ALWAYS decrement global Product stock when consumed (whether from WIP or Store)
          // This ensures Product.stock reflects actual physical availability
          await tx.product.updateMany({
            where: { id: req.productId, tenantId },
            data: { stock: { decrement: new Decimal(req.quantity) } }
          });

          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: req.productId,
              warehouseId: targetWarehouse,
              quantity: new Decimal(req.quantity),
              type: 'OUT',
              reference: wo.orderNumber,
              notes: isFromWIP ? `WIP Consumption` : `Store Consumption`
            }
          });
        }

        const fgLoc = await tx.stockLocation.findUnique({
          where: {
            tenantId_productId_warehouseId_notes: {
              tenantId,
              productId: wo.bom.productId,
              warehouseId: targetWarehouse,
              notes: ''
            }
          }
        });

        if (fgLoc) {
          await tx.stockLocation.update({
            where: { id: fgLoc.id },
            data: { quantity: { increment: new Decimal(producedQty) } }
          });
        } else {
          await tx.stockLocation.create({
            data: {
              tenantId,
              productId: wo.bom.productId,
              warehouseId: targetWarehouse,
              quantity: new Decimal(producedQty),
              notes: ''
            }
          });
        }

        await tx.product.updateMany({
          where: { id: wo.bom.productId, tenantId },
          data: { stock: { increment: new Decimal(producedQty) } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: wo.bom.productId,
            warehouseId: targetWarehouse,
            quantity: new Decimal(producedQty),
            type: 'IN',
            reference: wo.orderNumber,
            notes: `Production Receipt (Good Qty: ${producedQty}, Scrap Qty: ${scrapQty})`
          }
        });

        const fgAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.FINISHED_GOODS } },
        });
        const wipAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.WIP } }
        });
        const rmAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.RAW_MATERIALS } },
        });

        if (fgAccount && (wipAccount || rmAccount)) {
          const costData = await this.getBOMCost(tenantId, wo.bomId);
          const totalProductionValue = new Decimal(costData.totalCost).mul(producedQty);
          const materialValueConsumed = new Decimal(costData.materialCost).mul(totalConsumedQty);
          const scrapValue = new Decimal(costData.materialCost).mul(scrapQty);
          const overheadValue = new Decimal(costData.overheadCost).mul(producedQty);

          const isFromWIP = wo.status === 'InProgress';
          const creditAccount = (isFromWIP && wipAccount) ? wipAccount : rmAccount!;

          const transactions = [
            { accountId: fgAccount.id, type: 'Debit' as any, amount: totalProductionValue.toNumber(), description: `Finished Goods - ${wo.orderNumber}` },
            { accountId: creditAccount.id, type: 'Credit' as any, amount: materialValueConsumed.toNumber(), description: `${isFromWIP ? 'WIP' : 'RM'} Consumption - ${wo.orderNumber}` },
          ];

          const deprAccount = await tx.account.findFirst({
            where: { tenantId, name: StandardAccounts.MANUFACTURING_OVERHEAD_ABSORBED }
          });
          if (deprAccount) {
            transactions.push({ accountId: deprAccount.id, type: 'Credit' as any, amount: overheadValue.toNumber(), description: `Overhead Absorbed - ${wo.orderNumber}` });
          }

          const scrapAccount = await tx.account.findFirst({
            where: { tenantId, name: StandardAccounts.SCRAP_EXPENSE }
          });
          if (scrapAccount && scrapValue.greaterThan(0)) {
            transactions.push({ accountId: scrapAccount.id, type: 'Debit' as any, amount: scrapValue.toNumber(), description: `Production Scrap - ${wo.orderNumber}` });
          }

          await this.accounting.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Production Completion: ${wo.orderNumber}`,
            reference: wo.orderNumber,
            transactions
          }, tx);
        }

        const completionLog = { success: true, producedQty, scrapQty, timestamp: new Date() };

        await tx.workOrder.update({
          where: { id: woId },
          data: {
            status: 'Completed',
            endDate: new Date(),
            producedQuantity: producedQty,
            scrapQuantity: scrapQty,
            idempotencyKey: idempotencyKey,
            completionLog: completionLog as any
          } as any,
        });

        return completionLog;
      });
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      this.logger.error(`Critical Production Failure for WO ${wo.orderNumber}: ${err.message}`);
      throw new BadRequestException(`Production Completion Failure: ${err.message}`);
    }
  }

  async checkShortagesFromWO(tenantId: string, woId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: woId, tenantId },
    });
    if (!wo) throw new NotFoundException('Work Order not found');
    return this.checkShortages(tenantId, wo.bomId, wo.quantity);
  }

  async createWorkOrder(
    tenantId: string,
    data: { bomId: string; quantity: number },
  ) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id: data.bomId, tenantId },
    });
    if (!bom) throw new NotFoundException('BOM not found');

    const count = await this.prisma.workOrder.count({ where: { tenantId } });
    const orderNumber = `WO-${(count + 1).toString().padStart(4, '0')}`;

    return this.prisma.workOrder.create({
      data: {
        tenantId,
        orderNumber,
        bomId: data.bomId,
        quantity: data.quantity,
        status: 'Planned',
      },
    });
  }
}
