import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccountSelectors,
  StandardAccounts,
} from '../accounting/constants/account-names';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountingService } from '../accounting/accounting.service';
import { TraceService } from '../common/services/trace.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ManufacturingService {
  private readonly logger = new Logger(ManufacturingService.name);

  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private traceService: TraceService,
    private inventoryService: InventoryService,
  ) {}

  /**
   * Explodes a Bill of Materials recursively to find total raw material requirements.
   */
  async explodeBOM(tenantId: string, bomId: string, multiplier: number = 1) {
    // MFG-002: Performance Scaling via Recursive CTE
    // This replaces a potentially deep recursive JS chain with a single database round-trip.
    const rawResults: any[] = await this.prisma.$queryRaw`
      WITH RECURSIVE exploded_bom AS (
        -- Anchor member: get the initial items for the starting BOM
        SELECT 
          ${bomId}::text as "currentBomId",
          bi."productId" as "productId",
          bi.quantity::numeric * ${multiplier}::numeric as quantity,
          bi.unit as unit,
          p.name as "productName",
          p."costPrice" as "costPrice",
          p."baseUnit" as "baseUnit",
          ARRAY[${bomId}::text] as path,
          false as is_cycle,
          1 as depth
        FROM "BOMItem" bi
        JOIN "Product" p ON bi."productId" = p.id
        WHERE bi."bomId" = ${bomId} AND bi."tenantId" = ${tenantId}

        UNION ALL

        -- Recursive member: if any of the items has its own active BOM, explode it
        SELECT 
          bom.id::text as "currentBomId",
          sub_bi."productId" as "productId",
          sub_bi.quantity::numeric * eb.quantity::numeric as quantity,
          sub_bi.unit as unit,
          sub_p.name as "productName",
          sub_p."costPrice" as "costPrice",
          sub_p."baseUnit" as "baseUnit",
          eb.path || bom.id::text as path,
          bom.id::text = ANY(eb.path) as is_cycle,
          eb.depth + 1 as depth
        FROM exploded_bom eb
        JOIN "BillOfMaterial" bom ON eb."productId" = bom."productId" 
          AND bom."tenantId" = ${tenantId} 
          AND bom.status = 'Active'
        JOIN "BOMItem" sub_bi ON bom.id = sub_bi."bomId" AND sub_bi."tenantId" = ${tenantId}
        JOIN "Product" sub_p ON sub_bi."productId" = sub_p.id
        WHERE eb.is_cycle = false AND eb.depth < 10 -- Zenith Guard: Limit recursion depth
      )
      SELECT 
        eb.*,
        EXISTS (
          SELECT 1 FROM "BillOfMaterial" sub_bom 
          WHERE sub_bom."productId" = eb."productId" 
          AND sub_bom."tenantId" = ${tenantId} 
          AND sub_bom.status = 'Active'
        ) as "hasActiveBom"
      FROM exploded_bom eb
    `;

    if (rawResults.some((res) => res.is_cycle)) {
      throw new BadRequestException(
        `Production Audit Error: Circular dependency detected in Bill of Materials. BOM ID ${bomId} points back to an active parent assembly.`,
      );
    }

    if (!rawResults || rawResults.length === 0) {
      // Check if BOM exists at all to match previous behavior
      const bom = await this.prisma.billOfMaterial.findFirst({
        where: { id: bomId, tenantId },
      });
      if (!bom) throw new NotFoundException('BOM not found');
      return [];
    }

    // Filter to leaf materials (those that don't have their own active BOM)
    const leafResults = rawResults.filter((res) => !res.hasActiveBom);

    let requirements: any[] = [];
    for (const res of leafResults) {
      // INV-007: Support Unit Conversions (Post-flattening)
      const baseUnit = res.baseUnit || 'pcs';
      const baseQty = await this.convertUnit(
        tenantId,
        res.productId,
        new Decimal(res.quantity),
        res.unit ?? 'pcs',
        baseUnit,
      );

      requirements.push({
        productId: res.productId,
        productName: res.productName,
        quantity: baseQty,
        unit: baseUnit,
        costPrice: new Decimal(res.costPrice || 0),
      });
    }

    return this.aggregateRequirements(requirements);
  }

  // INV-007: Helper for Unit Conversions
  private async convertUnit(
    tenantId: string,
    productId: string,
    quantity: Decimal,
    fromUnit: string,
    toUnit: string,
  ): Promise<Decimal> {
    if (fromUnit === toUnit) return quantity;

    // Check for product-specific conversion
    let conversion = await (this.prisma as any).unitConversion.findFirst({
      where: {
        tenantId,
        fromUnit,
        toUnit,
        productId,
      },
    });

    if (!conversion) {
      // Check for global conversion
      conversion = await (this.prisma as any).unitConversion.findFirst({
        where: {
          tenantId,
          fromUnit,
          toUnit,
          productId: null,
        },
      });
    }

    if (conversion) {
      return quantity.mul(conversion.factor);
    }

    // Default hardcoded conversions if not in DB
    const lowerFrom = fromUnit.toLowerCase();
    const lowerTo = toUnit.toLowerCase();

    if (lowerFrom === 'kg' && lowerTo === 'g') return quantity.mul(1000);
    if (lowerFrom === 'g' && lowerTo === 'kg') return quantity.div(1000);
    if (lowerFrom === 'l' && lowerTo === 'ml') return quantity.mul(1000);
    if (lowerFrom === 'ml' && lowerTo === 'l') return quantity.div(1000);

    return quantity; // Fallback to no conversion
  }

  // BOM Management
  async createBOM(tenantId: string, data: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException(
        'Product not found or access denied in your workspace.',
      );
    }

    return (this.prisma as any).billOfMaterial.create({
      data: {
        ...data,
        tenantId,
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
        correlationId: (this.traceService as any).getCorrelationId(), // Forensic Trace
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

  /**
   * Bulk BOM Importer
   * CSV: finishProductSku, ingredientSku, quantity, unit
   */
  async importBoms(tenantId: string, csvContent: string) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    const results = {
      total: lines.length - 1,
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    // --- INDUSTRY INVARIANT: MANUFACTURING BLOCK ---
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const industry = tenant?.industry || tenant?.type;

    if (industry !== 'Manufacturing' && industry !== 'Construction') {
      throw new BadRequestException(
        'Migration Blocked: BOM imports are reserved for Manufacturing or Construction verticals. Integrity Drift detected.',
      );
    }

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(',').map((c) => c.trim());
      const data: any = {};
      headers.forEach((h, idx) => {
        data[h] = cols[idx];
      });

      try {
        const finishSku = data.finishProductSku;
        const ingredientSku = data.ingredientSku;
        const qty = parseFloat(data.quantity) || 0;

        if (!finishSku || !ingredientSku || qty <= 0) {
          throw new Error('Missing Sku or Quantity');
        }

        const [finishProd, ingredient] = await Promise.all([
          this.prisma.product.findFirst({
            where: { tenantId, sku: finishSku },
          }),
          this.prisma.product.findFirst({
            where: { tenantId, sku: ingredientSku },
          }),
        ]);

        if (!finishProd)
          throw new Error(`Finish Product SKU ${finishSku} not found`);
        if (!ingredient)
          throw new Error(`Ingredient SKU ${ingredientSku} not found`);

        const bom = await this.prisma.billOfMaterial.findFirst({
          where: { tenantId, productId: finishProd.id, status: 'Active' },
        });

        let targetBom: any = bom;
        if (!targetBom) {
          targetBom = await (this.prisma as any).billOfMaterial.create({
            data: {
              tenantId,
              productId: finishProd.id,
              name: `Imported BOM - ${finishProd.name}`,
              status: 'Active',
              overheadRate: new Decimal(0),
            },
          });
        }

        const existingItem = await this.prisma.bOMItem.findFirst({
          where: { bomId: targetBom.id, productId: ingredient.id },
        });

        if (existingItem) {
          await this.prisma.bOMItem.update({
            where: { id: existingItem.id },
            data: { quantity: new Decimal(qty) },
          });
        } else {
          await (this.prisma as any).bOMItem.create({
            data: {
              tenantId,
              bomId: targetBom.id,
              productId: ingredient.id,
              quantity: new Decimal(qty),
              unit: data.unit || 'Unit',
            },
          });
        }
        results.imported++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Line ${i}: ${e.message}`);
      }
    }
    return results;
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

  async approveWorkOrder(tenantId: string, id: string, user: any) {
    const channel = user.channel || 'WEB';
    const role = user.role;

    // Mobile Governance: Owners/Managers only
    if (channel === 'MOBILE' && role !== 'Owner' && role !== 'Manager') {
      throw new BadRequestException(
        'Governance Error: Only Owners or Managers can approve job cards from mobile.',
      );
    }

    const wo = await this.prisma.workOrder.findFirst({
      where: { id, tenantId },
    });
    if (!wo) throw new NotFoundException('Work Order not found');

    const updated = await this.prisma.workOrder.updateMany({
      where: { id, tenantId },
      data: { status: 'Confirmed' },
    });

    await (this.prisma as any).auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'MOBILE_JOB_CARD_APPROVAL',
        resource: `WorkOrder:${id}`,
        channel,
        details: {
          role,
          previousStatus: wo.status,
          newStatus: 'Confirmed',
          mobileIntent: 'MOBILE_INTENT_ONLY',
        },
      },
    });

    return updated;
  }

  async rejectWorkOrder(tenantId: string, id: string, user: any) {
    const channel = user.channel || 'WEB';
    const role = user.role;

    if (channel === 'MOBILE' && role !== 'Owner' && role !== 'Manager') {
      throw new BadRequestException(
        'Governance Error: Only Owners or Managers can reject job cards from mobile.',
      );
    }

    const wo = await this.prisma.workOrder.findFirst({
      where: { id, tenantId },
    });
    if (!wo) throw new NotFoundException('Work Order not found');

    const updated = await this.prisma.workOrder.updateMany({
      where: { id, tenantId },
      data: { status: 'Cancelled' },
    });

    await (this.prisma as any).auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'MOBILE_JOB_CARD_REJECTION',
        resource: `WorkOrder:${id}`,
        channel,
        details: {
          role,
          previousStatus: wo.status,
          newStatus: 'Cancelled',
          mobileIntent: 'MOBILE_INTENT_ONLY',
        },
      },
    });

    return updated;
  }

  async startWorkOrder(
    tenantId: string,
    woId: string,
    warehouseId?: string,
    machineId?: string,
    idempotencyKey?: string,
  ) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: woId, tenantId },
      include: { bom: true },
    });

    if (!wo) throw new NotFoundException('Work Order not found');
    // MFG-001: Accept both 'Planned' and 'Confirmed' as valid start states.
    // approveWorkOrder() sets status to 'Confirmed', so requiring only 'Planned'
    // made it impossible to start an approved work order.
    const startableStatuses = ['Planned', 'Confirmed'];
    if (!startableStatuses.includes(wo.status))
      throw new BadRequestException(
        `Cannot start Work Order in ${wo.status} status. Expected: Planned or Confirmed.`,
      );

    const requirements = await this.explodeBOM(
      tenantId,
      wo.bomId,
      Number(wo.quantity),
    );

    return await this.prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.workOrder.findFirst({
          where: { id: woId, tenantId, status: 'InProgress' },
        });
        if (existing) return { success: true, alreadyStarted: true };
      }

      await this.accounting.ledger.checkPeriodLock(tenantId, new Date(), tx);

      const warehouse =
        (await tx.warehouse.findFirst({
          where: { tenantId, id: warehouseId || undefined },
        })) || (await tx.warehouse.findFirst({ where: { tenantId } }));

      if (!warehouse)
        throw new BadRequestException(
          'No warehouse found. Please create a warehouse first.',
        );
      const targetWarehouse = warehouseId || warehouse?.id;

      if (!targetWarehouse)
        throw new Error('No valid warehouse found for production storage.');

      for (const req of requirements) {
        // INV-008: Atomic Stock Movement to WIP
        await this.inventoryService.deductStock(
          tx,
          req.productId,
          targetWarehouse,
          req.quantity,
          '', // From main stock
          {
            tenantId,
            reference: wo.orderNumber,
            correlationId: (this.traceService as any).getCorrelationId(),
          },
        );

        // Record WIP Receipt in StockLocation
        const wipLoc = await (tx.stockLocation as any).findUnique({
          where: {
            tenantId_productId_warehouseId_notes: {
              tenantId,
              productId: req.productId,
              warehouseId: targetWarehouse,
              notes: 'WIP_BIN',
            },
          },
        });

        if (wipLoc) {
          await tx.stockLocation.update({
            where: { id: wipLoc.id },
            data: { quantity: { increment: new Decimal(req.quantity) } },
          });
        } else {
          await (tx.stockLocation as any).create({
            data: {
              tenantId,
              productId: req.productId,
              warehouseId: targetWarehouse,
              quantity: new Decimal(req.quantity),
              notes: 'WIP_BIN',
            },
          });
        }

        await (tx.stockMovement as any).create({
          data: {
            tenantId,
            productId: req.productId,
            warehouseId: targetWarehouse,
            quantity: new Decimal(req.quantity),
            type: 'IN',
            reference: wo.orderNumber,
            notes: `WIP Receipt: Internal Transfer`,
            correlationId: (this.traceService as any).getCorrelationId(), // Trace Link
          },
        });
      }

      const wipAccount = await tx.account.findFirst({
        where: { tenantId, name: { in: AccountSelectors.WIP } },
      });
      const rmAccount = await tx.account.findFirst({
        where: { tenantId, name: { in: AccountSelectors.RAW_MATERIALS } },
      });

      if (wipAccount && rmAccount) {
        let totalWipValue = new Decimal(0);
        for (const req of requirements) {
          totalWipValue = totalWipValue.add(
            new Decimal(req.costPrice || 0).mul(req.quantity),
          );
        }

        if (totalWipValue.gt(0)) {
          await this.accounting.ledger.createJournalEntry(
            tenantId,
            {
              date: new Date().toISOString(),
              description: `Production Issue (WIP): ${wo.orderNumber}`,
              reference: wo.orderNumber,
              correlationId: this.traceService.getCorrelationId(), // Trace Link
              transactions: [
                {
                  accountId: wipAccount.id,
                  type: 'Debit',
                  amount: totalWipValue.toNumber(),
                  description: 'RM to WIP Transfer',
                },
                {
                  accountId: rmAccount.id,
                  type: 'Credit',
                  amount: totalWipValue.toNumber(),
                  description: 'RM to WIP Transfer',
                },
              ],
            },
            tx,
          );
        }
      }

      if (machineId) {
        const machine = await (tx as any).machine.findUnique({
          where: { id: machineId, tenantId },
        });
        if (!machine)
          throw new NotFoundException(
            'Machine not found or access denied in your workspace.',
          );
        await tx.machine.update({
          where: { id: machineId },
          data: { status: 'Running' },
        });
      }

      await tx.workOrder.update({
        where: { id: woId },
        data: {
          status: 'InProgress',
          startDate: new Date(),
          machineId: machineId || undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'MANUFACTURING_STARTED',
          resource: `WorkOrder:${wo.id}`,
          details: {
            orderNumber: wo.orderNumber,
            warehouseId: warehouse.id,
            machineId: machineId || null,
          } as any,
        },
      });

      return { success: true, orderNumber: wo.orderNumber, machineId };
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
        acc[productId].quantity = acc[productId].quantity.add(
          new Decimal(curr.quantity),
        );
      }
      return acc;
    }, {});

    return Object.values(aggregated).map((r: any) => ({
      ...r,
      quantity: r.quantity.toNumber(),
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
      materialCost = materialCost.add(
        new Decimal(req.costPrice || 0).mul(req.quantity),
      );
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
    const requirements: any[] = await this.explodeBOM(
      tenantId,
      bomId,
      quantity,
    );
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

  async completeWorkOrder(
    tenantId: string,
    woId: string,
    producedQtyStr?: number | string,
    scrapQtyStr?: number | string,
    machineId?: string,
    machineTimeHours?: number,
    operatorName?: string,
    warehouseId?: string,
    idempotencyKey?: string,
  ) {
    const wo = (await this.prisma.workOrder.findFirst({
      where: { id: woId, tenantId },
      include: { bom: { include: { product: true } } },
    })) as any;

    if (!wo) throw new NotFoundException('Work Order not found');

    // 1. Idempotency Check
    if (
      idempotencyKey &&
      wo.idempotencyKey === idempotencyKey &&
      wo.status === 'Completed'
    ) {
      return (
        wo.completionLog || {
          success: true,
          message: 'Already completed (Idempotent)',
        }
      );
    }

    if (wo.status === 'Completed')
      throw new BadRequestException('Work Order already completed');

    const producedQty =
      producedQtyStr !== undefined ? Number(producedQtyStr) : wo.quantity;
    const scrapQty = scrapQtyStr !== undefined ? Number(scrapQtyStr) : 0;

    if (producedQty < 0 || scrapQty < 0) {
      throw new BadRequestException(
        'Zenith Guard: Production and scrap quantities must be non-negative.',
      );
    }

    try {
      // Consume raw materials based on the sum of produced and scrap
      const totalConsumedQty = producedQty + scrapQty;
      const requirements: any[] = await this.explodeBOM(
        tenantId,
        wo.bomId,
        totalConsumedQty > 0 ? totalConsumedQty : wo.quantity,
      );

      return await this.prisma.$transaction(async (tx) => {
        // BUG-002 FIX: Period lock check MUST occur inside the transaction
        // to prevent race conditions where a period is locked immediately after the check.
        await this.accounting.checkPeriodLock(tenantId, new Date(), tx);

        const targetWarehouse =
          warehouseId ||
          (
            await tx.warehouse.findFirst({
              where: { tenantId },
              orderBy: { id: 'asc' },
            })
          )?.id;

        if (!targetWarehouse)
          throw new Error('No valid warehouse found for production storage.');

        for (const req of requirements) {
          const isFromWIP = wo.status === 'InProgress';

          if (isFromWIP) {
            // Consume from WIP Bin (Guarded)
            await this.inventoryService.deductStock(
              tx,
              req.productId,
              targetWarehouse,
              req.quantity,
              'WIP_BIN',
            );
          } else {
            // Direct consumption from Store (Guarded)
            await this.inventoryService.deductStock(
              tx,
              req.productId,
              targetWarehouse,
              req.quantity,
              '',
            );
          }

          await (tx as any).stockMovement.create({
            data: {
              tenantId,
              productId: req.productId,
              warehouseId: targetWarehouse,
              quantity: new Decimal(req.quantity),
              type: 'OUT',
              reference: targetWarehouse, // Using warehouseId as reference for trace
              notes: isFromWIP ? `WIP Consumption` : `Store Consumption`,
              correlationId: this.traceService.getCorrelationId(), // Trace Link
            },
          });
        }

        // Create Finished Good stock (Guarded Increment)
        await (tx as any).stockLocation.upsert({
          where: {
            tenantId_productId_warehouseId_notes: {
              tenantId,
              productId: wo.bom.productId,
              warehouseId: targetWarehouse,
              notes: '',
            },
          },
          create: {
            tenantId,
            productId: wo.bom.productId,
            warehouseId: targetWarehouse,
            quantity: new Decimal(producedQty),
            notes: '',
          },
          update: { quantity: { increment: new Decimal(producedQty) } },
        });

        await tx.product.update({
          where: { id: wo.bom.productId },
          data: { stock: { increment: new Decimal(producedQty) } },
        });

        await (tx as any).stockMovement.create({
          data: {
            tenantId,
            productId: wo.bom.productId,
            warehouseId: targetWarehouse,
            quantity: new Decimal(producedQty),
            type: 'IN',
            reference: wo.orderNumber,
            notes: `Production Receipt (Good Qty: ${producedQty}, Scrap Qty: ${scrapQty})`,
            correlationId: (this.traceService as any).getCorrelationId(), // Trace Link
          },
        });

        const fgAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.FINISHED_GOODS } },
        });
        const wipAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.WIP } },
        });
        const rmAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.RAW_MATERIALS } },
        });

        if (fgAccount && (wipAccount || rmAccount)) {
          const costData = await this.getBOMCost(tenantId, wo.bomId);

          let materialValueConsumed = new Decimal(costData.materialCost).mul(
            totalConsumedQty,
          );

          const isFromWIP = wo.status === 'InProgress';

          // BUG-MFG-003: Prevent WIP value leak by recovering actual issue cost
          if (isFromWIP && wipAccount) {
            const previousIssue = await tx.journalEntry.findFirst({
              where: {
                tenantId,
                reference: wo.orderNumber,
                description: { contains: 'Issue' },
              },
              include: {
                transactions: {
                  where: { accountId: wipAccount.id, type: 'Debit' },
                },
              },
            });

            if (previousIssue && previousIssue.transactions.length > 0) {
              const issueValue = new Decimal(
                previousIssue.transactions[0].amount,
              );
              // If we are consuming exactly what was planned, use the exact recorded value to clear the account.
              // This prevents residuals if the Product costPrice was changed during production.
              if (new Decimal(wo.quantity).equals(totalConsumedQty)) {
                materialValueConsumed = issueValue;
              }
            }
          }

          let totalProductionValue = new Decimal(costData.totalCost).mul(
            producedQty,
          );

          const scrapValue = new Decimal(costData.materialCost).mul(scrapQty);
          let overheadValue = new Decimal(costData.overheadCost).mul(
            producedQty,
          );

          // If machine info is provided, override overhead calculation for precision
          if (machineId && machineTimeHours) {
            const machine = await (tx as any).machine.findFirst({
              where: { id: machineId, tenantId },
            });
            if (machine && machine.hourlyRate) {
              const machineCost = new Decimal(machine.hourlyRate).mul(
                machineTimeHours,
              );
              overheadValue = machineCost; // Precision Overhead
              totalProductionValue = materialValueConsumed
                .sub(scrapValue)
                .add(overheadValue);
            }
          }

          const creditAccount =
            isFromWIP && wipAccount ? wipAccount : rmAccount!;

          const transactions = [
            {
              accountId: fgAccount.id,
              type: 'Debit' as any,
              amount: totalProductionValue.toNumber(),
              description: `Finished Goods - ${wo.orderNumber}`,
            },
            {
              accountId: creditAccount.id,
              type: 'Credit' as any,
              amount: materialValueConsumed.toNumber(),
              description: `${isFromWIP ? 'WIP' : 'RM'} Consumption - ${wo.orderNumber}`,
            },
          ];

          // 100x Logic: Activity-Based Costing (ABC) expansion
          // Split overheads into Machine vs Labor components if specific accounts exist
          const laborAccount = await tx.account.findFirst({
            where: { tenantId, name: 'Manufacturing Labor Absorbed' },
          });
          const deprAccount = await tx.account.findFirst({
            where: {
              tenantId,
              name: StandardAccounts.MANUFACTURING_OVERHEAD_ABSORBED,
            },
          });

          if (deprAccount) {
            // Absorb machine-based overhead
            transactions.push({
              accountId: deprAccount.id,
              type: 'Credit' as any,
              amount: overheadValue.toNumber(),
              description: `ABC Machine Overhead Absorbed - ${wo.orderNumber}`,
            });
          }

          if (laborAccount && machineTimeHours) {
            // ACC-005: Use the machine's own hourlyRate as the labor absorption rate.
            // The hardcoded constant (50) was removed — rates vary by machine and site.
            // If the machine has no hourlyRate configured, labor absorption is skipped
            // rather than posting an inaccurate fixed value to the ledger.
            const machineForLabor = machineId
              ? await (tx as any).machine.findFirst({
                  where: { id: machineId, tenantId },
                })
              : null;
            const effectiveLaborRate = machineForLabor?.hourlyRate
              ? new Decimal(machineForLabor.hourlyRate)
              : null;

            if (effectiveLaborRate && effectiveLaborRate.greaterThan(0)) {
              const absorbedLabor = effectiveLaborRate.mul(machineTimeHours);
              transactions.push({
                accountId: laborAccount.id,
                type: 'Credit' as any,
                amount: absorbedLabor.toNumber(),
                description: `ABC Labor Cost Absorbed (${effectiveLaborRate}/hr × ${machineTimeHours}h) - ${wo.orderNumber}`,
              });
              // Total FG value includes absorbed labor
              transactions[0].amount = new Decimal(transactions[0].amount)
                .add(absorbedLabor)
                .toNumber();
            }
          }

          const scrapAccount = await tx.account.findFirst({
            where: { tenantId, name: StandardAccounts.SCRAP_EXPENSE },
          });
          if (scrapAccount && scrapValue.greaterThan(0)) {
            transactions.push({
              accountId: scrapAccount.id,
              type: 'Debit' as any,
              amount: scrapValue.toNumber(),
              description: `Production Scrap - ${wo.orderNumber}`,
            });
          }

          await this.accounting.ledger.createJournalEntry(
            tenantId,
            {
              date: new Date().toISOString(),
              description: `Production Completion: ${wo.orderNumber}`,
              reference: wo.orderNumber,
              correlationId: this.traceService.getCorrelationId(), // Trace Link
              transactions,
            },
            tx,
          );
        }

        const completionLog = {
          success: true,
          producedQty,
          scrapQty,
          timestamp: new Date(),
        };

        await tx.workOrder.update({
          where: { id: woId },
          data: {
            status: 'Completed',
            endDate: new Date(),
            producedQuantity: producedQty,
            scrapQuantity: scrapQty,
            machineId: machineId || null,
            machineTimeHours: machineTimeHours || null,
            operatorName: operatorName || null,
            idempotencyKey: idempotencyKey,
            completionLog: completionLog as any,
          } as any,
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'MANUFACTURING_COMPLETED',
            resource: `WorkOrder:${wo.id}`,
            details: {
              orderNumber: wo.orderNumber,
              producedQuantity: producedQty,
              scrapQuantity: scrapQty,
              machineId,
              operatorName,
            } as any,
          },
        });

        // Set machines to Idle (the one used for this WO)
        const machinesToRelease = new Set<string>();
        if (wo.machineId) machinesToRelease.add(wo.machineId);
        if (machineId) machinesToRelease.add(machineId);

        for (const mid of machinesToRelease) {
          await tx.machine.updateMany({
            where: { id: mid, tenantId },
            data: { status: 'Idle' },
          });
        }

        return completionLog;
      });
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      )
        throw err;
      this.logger.error(
        `Critical Production Failure for WO ${wo.orderNumber}: ${err.message}`,
      );
      throw new BadRequestException(
        `Production Completion Failure: ${err.message}`,
      );
    }
  }

  async checkShortagesFromWO(tenantId: string, woId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: woId, tenantId },
    });
    if (!wo) throw new NotFoundException('Work Order not found');
    return this.checkShortages(tenantId, wo.bomId, Number(wo.quantity));
  }

  async createWorkOrder(
    tenantId: string,
    data: { bomId: string; quantity: number },
  ) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id: data.bomId, tenantId },
    });
    if (!bom) throw new NotFoundException('BOM not found');

    // --- INDUSTRY INVARIANT: MANUFACTURING BLOCK ---
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const industry = tenant?.industry || tenant?.type;

    if (industry !== 'Manufacturing' && industry !== 'Construction') {
      throw new BadRequestException(
        'Vertical Compliance Violation: Work Orders are reserved for Manufacturing or Construction fabrication flows.',
      );
    }

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

  async getDashboardOverview(tenantId: string) {
    const [boms, workOrders, machines] = await Promise.all([
      this.prisma.billOfMaterial.findMany({
        where: { tenantId },
        include: { product: true, items: { include: { product: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.findMany({
        where: { tenantId },
        include: { bom: { include: { product: true, items: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.machine.findMany({
        where: { tenantId },
        take: 10,
      }),
    ]);

    return { boms, workOrders, machines };
  }
}
