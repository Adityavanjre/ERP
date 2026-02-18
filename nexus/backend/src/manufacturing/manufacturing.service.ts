import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class ManufacturingService {
  private readonly logger = new Logger(ManufacturingService.name);

  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
  ) {}

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
      const totalQty = Number(item.quantity) * multiplier;

      // Check if this component has its own BOM (Recursive)
      const subBOM = await this.prisma.billOfMaterial.findFirst({
        where: { productId: item.productId, tenantId, status: 'Active' },
      });

      if (subBOM) {
        const subRequirements = await this.explodeBOM(tenantId, subBOM.id, totalQty, depth + 1);
        requirements = [...requirements, ...subRequirements];
      } else {
        requirements.push({
          productId: item.productId,
          productName: item.product.name,
          quantity: totalQty,
          unit: item.unit,
          costPrice: Number(item.product.costPrice || 0),
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
            productId: item.productId,
            quantity: new Decimal(item.quantity),
            unit: item.unit,
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
      if (!acc[curr.productId]) {
        acc[curr.productId] = { ...curr };
      } else {
        acc[curr.productId].quantity += curr.quantity;
      }
      return acc;
    }, {});

    return Object.values(aggregated);
  }

  async getBOMCost(tenantId: string, bomId: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id: bomId, tenantId },
    });
    if (!bom) throw new NotFoundException('BOM not found');

    const requirements: any[] = await this.explodeBOM(tenantId, bomId, 1);
    let materialCost = 0;
    for (const req of requirements) {
      materialCost += (req.costPrice || 0) * req.quantity;
    }

    const overheadRate = Number((bom as any).overheadRate || 0);
    const overheadCost = (bom as any).isOverheadFixed
      ? overheadRate
      : (materialCost * overheadRate) / 100;

    return {
      materialCost,
      overheadCost,
      totalCost: materialCost + overheadCost,
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

  async completeWorkOrder(tenantId: string, woId: string, warehouseId?: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: woId, tenantId },
      include: { bom: { include: { product: true } } },
    });

    if (!wo) throw new NotFoundException('Work Order not found');
    if (wo.status === 'Completed')
      throw new BadRequestException('Work Order already completed');

    await this.accounting.checkPeriodLock(tenantId, new Date());

    try {
      const requirements: any[] = await this.explodeBOM(tenantId, wo.bomId, wo.quantity);
      
      return await this.prisma.$transaction(async (tx) => {
        const targetWarehouse = warehouseId || (await tx.warehouse.findFirst({
          where: { tenantId },
          orderBy: { id: 'asc' }
        }))?.id;

        if (!targetWarehouse) throw new Error('No valid warehouse found for production storage.');

        for (const req of requirements) {
            const loc = await tx.stockLocation.findFirst({
                where: { productId: req.productId, warehouseId: targetWarehouse, warehouse: { tenantId } }
            });

            if (!loc || loc.quantity.lessThan(req.quantity)) {
                throw new BadRequestException(`Insufficient stock in warehouse for ${req.productName}. Required: ${req.quantity}, Available: ${loc?.quantity || 0}`);
            }

            await tx.stockLocation.updateMany({
                where: { id: loc.id, warehouse: { tenantId } },
                data: { quantity: { decrement: new Decimal(req.quantity) } }
            });

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
                    notes: `Production Consumption`
                }
            });
        }

        const fgLoc = await tx.stockLocation.findFirst({
            where: { productId: wo.bom.productId, warehouseId: targetWarehouse, warehouse: { tenantId } }
        });

        if (fgLoc) {
            await tx.stockLocation.updateMany({
                where: { id: fgLoc.id, warehouse: { tenantId } },
                data: { quantity: { increment: new Decimal(wo.quantity) } }
            });
        } else {
            await tx.stockLocation.create({
                data: {
                    productId: wo.bom.productId,
                    warehouseId: targetWarehouse,
                    quantity: new Decimal(wo.quantity)
                }
            });
        }

        await tx.product.updateMany({
          where: { id: wo.bom.productId, tenantId },
          data: { stock: { increment: new Decimal(wo.quantity) } },
        });

        await tx.stockMovement.create({
            data: {
                tenantId,
                productId: wo.bom.productId,
                warehouseId: targetWarehouse,
                quantity: new Decimal(wo.quantity),
                type: 'IN',
                reference: wo.orderNumber,
                notes: `Production Receipt`
            }
        });

        const inventoryAccount = await tx.account.findFirst({
          where: { tenantId, name: 'Inventory Asset' },
        });

        if (inventoryAccount) {
            const costData = await this.getBOMCost(tenantId, wo.bomId);
            const totalProductionValue = new Decimal(costData.totalCost).mul(wo.quantity);

            await tx.journalEntry.create({
                data: {
                    tenantId,
                    date: new Date(),
                    description: `Production Completion: ${wo.orderNumber} (${wo.bom.product.name})`,
                    reference: wo.orderNumber,
                    posted: true,
                    transactions: {
                        create: [
                            {
                                tenantId,
                                accountId: inventoryAccount.id,
                                type: 'Debit',
                                amount: totalProductionValue,
                                description: `WIP to Finish Goods - ${wo.orderNumber}`
                            },
                             {
                                tenantId,
                                accountId: inventoryAccount.id,
                                type: 'Credit',
                                amount: totalProductionValue,
                                description: `Production Cost Recovery - ${wo.orderNumber}`
                            }
                        ]
                    }
                }
            });
        }

        await tx.workOrder.updateMany({
          where: { id: woId, tenantId },
          data: { status: 'Completed', endDate: new Date() },
        });

        return { success: true };
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
