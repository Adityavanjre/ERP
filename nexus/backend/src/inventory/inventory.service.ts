import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { TraceService } from '../common/services/trace.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Industry } from '@nexus/shared';

// REMOVED: BillingService - subscription system removed
import {
  AccountSelectors,
  StandardAccounts,
} from '../accounting/constants/account-names';
import { HsnService } from './services/hsn.service';

// DI-002: Typed sentinel for dry-run transaction rollback.
// Using a named class (not a generic Error) prevents accidentally swallowing
// unrelated errors that happen to share the same message string.
class DryRunRollbackSignal extends Error {
  constructor() {
    super('DRY_RUN_ROLLBACK');
  }
}

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    // REMOVED: billing service - subscription system removed
    private hsn: HsnService,
    private readonly traceService: TraceService,
  ) {}

  async createProduct(
    tenantId: string,
    data: any & { correlationId?: string },
    userId?: string,
  ) {
    // --- INDUSTRY INVARIANT: NBFC BLOCK ---
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const industry = tenant?.industry || tenant?.type;

    if (industry === Industry.NBFC) {
      throw new ForbiddenException(
        'Vertical Compliance Violation: NBFC tenants are legally restricted from creating physical inventory items. Please use the NBFC Loan Management module for loan products.',
      );
    }

    // --- INDUSTRY INVARIANT: HEALTHCARE SAFETY ---
    if (
      industry === Industry.Healthcare &&
      !data.expiryDate &&
      !data.isNonExpiring
    ) {
      throw new BadRequestException(
        'Compliance Requirement: Healthcare vertical requires an Expiry Date (or isNonExpiring flag) for all medical/pharmacy items to ensure patient safety.',
      );
    }

    const { stock, warehouseId, basePrice, uom, correlationId: _, pricingMode, width, length, ...productData } = data;

    // HSN/GST Rate Validation
    if (productData.hsnCode && productData.gstRate !== undefined) {
      const { isValid, officialRate } = await this.hsn.validateGstRate(
        tenantId,
        productData.hsnCode,
        productData.gstRate,
      );
      if (!isValid && !productData.isGstOverride) {
        throw new BadRequestException(
          `Compliance Error: GST Rate mismatch for HSN ${productData.hsnCode}. ` +
            `Official Rate: ${officialRate}%, Provided: ${productData.gstRate}%. ` +
            `Set 'isGstOverride' to true if this is an intentional audit-logged override.`,
        );
      }
    }

    // Forensic SKU Uniqueness Guard
    if (productData.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { tenantId, sku: productData.sku },
      });
      if (existing) {
        throw new Error(
          `Integrity Violation: SKU '${productData.sku}' already exists${existing.isDeleted ? ' (in archive)' : ''}. Please resolve collision before creation.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      // REMOVED: Quota check - subscription system removed
      // await this.billing.checkQuota(tenantId, 'maxProducts', tx);

      const product = await tx.product.create({
        data: {
          ...productData,
          price: basePrice !== undefined ? basePrice : 0,
          baseUnit: uom || 'pcs',
          pricingMode: (pricingMode as any) || 'piece',
          width: width ?? null,
          length: length ?? null,
          stock: 0,
          tenantId,
        },
      });

      if (stock && stock > 0) {
        let resolvedWarehouseId = warehouseId;
        if (!resolvedWarehouseId) {
          const defaultWh = await tx.warehouse.findFirst({ where: { tenantId } });
          resolvedWarehouseId = defaultWh?.id;
        }

        if (resolvedWarehouseId) {
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: product.id,
              warehouseId: resolvedWarehouseId,
              quantity: stock,
              type: 'IN',
              reference: 'INITIAL-STOCK',
              notes: 'Initial stock on product creation',
              correlationId:
                data.correlationId || this.traceService.getCorrelationId(),
            },
          });

          await tx.stockLocation.upsert({
            where: {
              tenantId_productId_warehouseId_notes: {
                tenantId,
                productId: product.id,
                warehouseId: resolvedWarehouseId,
                notes: '',
              },
            },
            create: {
              tenantId,
              productId: product.id,
              warehouseId: resolvedWarehouseId,
              quantity: stock,
              notes: '',
            },
            update: {
              quantity: { increment: stock },
            },
          });

          const invAccount = await tx.account.findFirst({
            where: { tenantId, name: { in: AccountSelectors.INVENTORY } },
          });
          const equityAccount = await tx.account.findFirst({
            where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY },
          });

          if (invAccount && equityAccount) {
            const movementValue = new Decimal(product.costPrice || 0).mul(
              new Decimal(stock),
            );
            await this.ledger.createJournalEntry(
              tenantId,
              {
                date: new Date().toISOString(),
                description: `Initial Stock: ${product.name}`,
                reference: `OB-${product.sku}`,
                correlationId:
                  data.correlationId || this.traceService.getCorrelationId(),
                transactions: [
                  {
                    accountId: invAccount.id,
                    type: 'Debit',
                    amount: movementValue.toNumber(),
                    description: 'Opening Stock Entry',
                  },
                  {
                    accountId: equityAccount.id,
                    type: 'Credit',
                    amount: movementValue.toNumber(),
                    description: 'Opening Stock Entry',
                  },
                ],
              },
              tx,
            );
          }
        }

        await tx.product.update({
          where: { id: product.id },
          data: { stock },
        });
      }

      return product;
    });
  }

  async getProducts(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId, isDeleted: false };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getProduct(tenantId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        stockLocations: {
          include: { warehouse: true },
        },
      },
    });
  }

  async findProductByCode(tenantId: string, code: string) {
    return this.prisma.product.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          { sku: code },
          { barcode: code },
          { skuAlias: code },
          { name: { contains: code, mode: 'insensitive' } },
        ],
      },
      include: {
        stockLocations: {
          include: { warehouse: true },
        },
      },
    });
  }

  async updateProduct(
    tenantId: string,
    id: string,
    data: any,
    userId?: string,
  ) {
    const { basePrice, uom, correlationId: _, pricingMode, width, length, ...productData } = data;
    const updateData: any = {
      ...productData,
    };
    if (basePrice !== undefined) updateData.price = basePrice;
    if (uom !== undefined) updateData.baseUnit = uom;
    if (pricingMode !== undefined) updateData.pricingMode = pricingMode;
    if (width !== undefined) updateData.width = width;
    if (length !== undefined) updateData.length = length;

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  // Enforces absolute stock integrity.
  // Prevents any operation from setting stock below zero.
  validateStockFloor(productName: string, newStock: any) {
    if (new Decimal(newStock).lt(0)) {
      throw new BadRequestException(
        `Integrity Error: Stock for "${productName}" cannot go below zero. ` +
          `Current Transaction Attempted Value: ${newStock}`,
      );
    }
  }

  /**
   * 100x Hardening: Atomic Stock Deduction
   * Uses a guarded update to ensure stock never goes negative even in concurrent race conditions.
   */
  async deductStock(
    tx: any,
    productId: string,
    warehouseId: string,
    quantity: number | Decimal,
    notes: string = '',
    options: {
      tenantId?: string;
      reference?: string;
      correlationId?: string;
    } = {},
  ) {
    const amount = new Decimal(quantity);

    const product = await tx.product.findFirst({
      where: options.tenantId
        ? { id: productId, tenantId: options.tenantId }
        : { id: productId },
    });
    const productName = product?.name || productId;

    // PRISMA_FIX: updateMany does not support atomic increment/decrement for Decimals correctly in all versions.
    // We use findUnique/First with the composite key then update by ID.
    let loc = await tx.stockLocation.findUnique({
      where: {
        tenantId_productId_warehouseId_notes: {
          tenantId: options.tenantId || product?.tenantId || '',
          productId,
          warehouseId,
          notes: notes || '',
        },
      },
    });

    if (!loc) {
      loc = await tx.stockLocation.create({
        data: {
          tenantId: options.tenantId || product?.tenantId || '',
          productId,
          warehouseId,
          notes: notes || '',
          quantity: new Decimal(0),
        },
      });
    }

    await tx.stockLocation.update({
      where: { id: loc.id },
      data: {
        quantity: { decrement: amount },
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        stock: { decrement: amount },
      },
    });

    // AUDIT-011: Inject StockMovement creation atomically so every deduction is traceable
    // regardless of which caller invokes deductStock. If tenantId is not provided we skip
    // the movement (backward compat with callers that create the movement themselves).
    if (options.tenantId) {
      await tx.stockMovement.create({
        data: {
          tenantId: options.tenantId,
          productId,
          warehouseId,
          quantity: amount,
          type: 'OUT',
          reference: options.reference ?? null,
          notes: notes || null,
          correlationId: options.correlationId ?? null,
        },
      });
    }
  }

  async deleteProduct(tenantId: string, id: string) {
    return this.prisma.product.updateMany({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  async importProducts(
    tenantId: string,
    csvContent: string,
    options: { dryRun?: boolean; correlationId?: string } = {},
  ) {
    const isDryRun = options.dryRun === true;
    let dryRunResults: any = null;

    const lines = csvContent
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);
    if (lines.length > 501) {
      throw new BadRequestException(
        'SME Stress Guard: Bulk import limited to 500 rows per batch to ensure transactional integrity.',
      );
    }

    try {
      const finalResults = await this.prisma.$transaction(async (tx: any) => {
        const headers = lines[0].split(',').map((h) => h.trim());

        const results = {
          total: 0,
          created: 0,
          updated: 0,
          errors: [] as { row: number; item?: string; message: string }[],
          imported: 0,
          failed: 0,
          preview: [] as any[],
        };

        const wh = await tx.warehouse.findFirst({ where: { tenantId } });
        if (!wh)
          throw new BadRequestException(
            'Import Failed: No warehouse found. Create at least one warehouse first.',
          );

        // --- INDUSTRY INVARIANT: NBFC BLOCK ---
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        const industry = tenant?.industry || tenant?.type;
        if (industry === Industry.NBFC) {
          throw new ForbiddenException(
            'Migration Blocked: NBFC tenants cannot import physical inventory. Integrity Drift detected.',
          );
        }

        let totalOpeningValue = new Decimal(0);

        for (let i = 1; i < lines.length; i++) {
          results.total++;
          const cols = lines[i].split(',').map((c) => c.trim());
          const data: any = {};
          headers.forEach((h, idx) => {
            if (cols[idx]) data[h.toLowerCase()] = cols[idx];
          });

          const sku = data.sku || data.code;
          if (!sku)
            throw new BadRequestException(`Line ${i + 1}: Missing SKU or Code`);

          let product = await tx.product.findFirst({
            where: { tenantId, sku },
          });
          const existing = !!product;

          const productPayload = {
            name: data.name || sku,
            sku,
            barcode: data.barcode || data.upc,
            description: data.description,
            // SCH-004: Schema field is 'price', not 'basePrice'. The old mapping
            // silently dropped the sell price on every bulk import row.
            price: Number(data.price || data.baseprice) || 0,
            costPrice: Number(data.cost || data.costprice) || 0,
            gstRate: Number(data.gstrate || data.tax) || 18,
            hsnCode: data.hsncode || data.hsn,
            baseUnit: data.uom || 'Unit',
          };

          if (existing) {
            product = await tx.product.update({
              where: { id: product.id },
              data: productPayload,
            });
            results.updated++;
          } else {
            product = await tx.product.create({
              data: { ...productPayload, tenantId },
            });
            results.created++;
          }

          // Handle initial stock in import
          const importStock = Number(data.stock || data.openingstock) || 0;
          if (importStock > 0) {
            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: product.id,
                warehouseId: wh.id,
                quantity: importStock,
                type: 'IN',
                reference: 'IMPORT-OB',
                notes: 'Bulk import opening balance',
                correlationId:
                  options.correlationId || this.traceService.getCorrelationId(),
              },
            });

            await tx.stockLocation.upsert({
              where: {
                tenantId_productId_warehouseId_notes: {
                  tenantId,
                  productId: product.id,
                  warehouseId: wh.id,
                  notes: '',
                },
              },
              create: {
                tenantId,
                productId: product.id,
                warehouseId: wh.id,
                quantity: importStock,
                notes: '',
              },
              update: {
                quantity: { increment: importStock },
              },
            });

            await tx.product.update({
              where: { id: product.id },
              data: { stock: { increment: importStock } },
            });

            const cost = Number(product.costPrice) || 0;
            totalOpeningValue = totalOpeningValue.add(
              new Decimal(cost).mul(importStock),
            );
          }

          results.imported++;
          results.preview.push({
            action: existing ? 'UPDATE' : 'CREATE',
            name: product.name,
            sku: product.sku,
            gstRate: product.gstRate,
            stock: importStock,
          });
        }

        if (totalOpeningValue.gt(0)) {
          const invAccount = await tx.account.findFirst({
            where: { tenantId, name: { in: AccountSelectors.INVENTORY } },
          });
          const equityAccount = await tx.account.findFirst({
            where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY },
          });

          if (invAccount && equityAccount) {
            await this.ledger.createJournalEntry(
              tenantId,
              {
                date: new Date().toISOString(),
                description: `Bulk Opening Stock Sync (${results.created + results.updated} items)`,
                reference: `IMPORT-OB-${Date.now()}`,
                correlationId:
                  options.correlationId || this.traceService.getCorrelationId(),
                transactions: [
                  {
                    accountId: invAccount.id,
                    type: 'Debit',
                    amount: totalOpeningValue.toNumber(),
                    description: 'Bulk Opening Stock Entry',
                  },
                  {
                    accountId: equityAccount.id,
                    type: 'Credit',
                    amount: totalOpeningValue.toNumber(),
                    description: 'Bulk Opening Stock Entry',
                  },
                ],
              },
              tx,
            );
        }
      }

        if (isDryRun) {
          dryRunResults = results;
          throw new DryRunRollbackSignal();
        }

        return results;
      });
      return finalResults;
    } catch (err: any) {
      if (err instanceof DryRunRollbackSignal) {
        return dryRunResults;
      } else {
        throw err;
      }
    }
  }

  cleanVal(val: string | null): string | null {
    if (!val) return null;
    return val.trim();
  }

  async getStats(tenantId: string) {
    const [totalProducts, totalStock, lowStock] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isDeleted: false } }),
      this.prisma.product.aggregate({
        where: { tenantId, isDeleted: false },
        _sum: { stock: true },
      }),
      this.prisma.product.count({
        where: {
          tenantId,
          isDeleted: false,
          stock: { lt: 10 },
        },
      }),
    ]);

    return {
      totalProducts,
      totalStock: totalStock._sum.stock || 0,
      lowStockCount: lowStock,
    };
  }

  // --- Retail Depth: Multi-Store Pricing ---
  async updateLocationPrice(
    tenantId: string,
    productId: string,
    warehouseId: string,
    price: number,
  ) {
    return (this.prisma as any).warehousePrice.upsert({
      where: {
        tenantId_productId_warehouseId: { tenantId, productId, warehouseId },
      },
      update: { price },
      create: { tenantId, productId, warehouseId, price },
    });
  }

  async getLocationPrice(
    tenantId: string,
    productId: string,
    warehouseId: string,
  ) {
    const locPrice = await (this.prisma as any).warehousePrice.findUnique({
      where: {
        tenantId_productId_warehouseId: { tenantId, productId, warehouseId },
      },
    });

    if (locPrice) return locPrice.price;

    const product = await this.prisma.product.findUnique({
      where: { id: productId, tenantId },
    });
    return product?.price || 0;
  }

  // --- Retail Depth: Dynamic Markdown AI ---
  // PERF-007: AI Suggestion Pagination.
  async getMarkdownSuggestions(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const total = await this.prisma.product.count({
      where: {
        tenantId,
        isDeleted: false,
        shelfLifeDays: { not: null },
      },
    });

    const products = await (this.prisma.product as any).findMany({
      where: {
        tenantId,
        isDeleted: false,
        shelfLifeDays: { not: null },
      },
      include: {
        stockLocations: {
          where: { quantity: { gt: 0 } },
        },
      },
      skip,
      take: limit,
      orderBy: { shelfLifeDays: 'asc' },
    });

    const suggestions = [];

    for (const product of products) {
      const shelfLifeDays = product.shelfLifeDays;
      if (!shelfLifeDays) continue;

      for (const loc of product.stockLocations) {
        const ageInDays = Math.floor(
          (Date.now() - new Date(loc.updatedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // 100x Logic: Dynamic Aging Calculus
        if (ageInDays > shelfLifeDays) {
          const discount = ageInDays > shelfLifeDays * 1.5 ? 0.3 : 0.15; // 30% or 15% markdown
          const suggestedPrice = new Decimal(product.price).mul(1 - discount);

          suggestions.push({
            productId: product.id,
            productName: product.name,
            warehouseId: loc.warehouseId,
            currentAge: ageInDays,
            threshold: shelfLifeDays,
            suggestedDiscount: `${discount * 100}%`,
            suggestedPrice: suggestedPrice.toFixed(2),
            reason: `Stock is ${ageInDays} days old (Threshold: ${shelfLifeDays}). Aging markdown recommended.`,
          });
        }
      }
    }

    return {
      data: suggestions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
