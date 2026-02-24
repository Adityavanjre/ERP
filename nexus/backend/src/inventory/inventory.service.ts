import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { TraceService } from '../common/services/trace.service';
import { Decimal } from '@prisma/client/runtime/library';

import { BillingService } from '../system/services/billing.service';
import { AccountSelectors, StandardAccounts } from '../accounting/constants/account-names';
import { HsnService } from './services/hsn.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private billing: BillingService,
    private hsn: HsnService,
    private readonly traceService: TraceService,
  ) { }

  async createProduct(tenantId: string, data: any & { correlationId?: string }, userId?: string) {
    // 0. Subscription Governance: Quota Check
    await this.billing.validateQuota(tenantId, 'maxProducts');

    const { stock, warehouseId, ...productData } = data;

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
        where: { tenantId, sku: productData.sku }
      });
      if (existing) {
        throw new Error(`Integrity Violation: SKU '${productData.sku}' already exists${existing.isDeleted ? ' (in archive)' : ''}. Please resolve collision before creation.`);
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          correlationId: data.correlationId || this.traceService.getCorrelationId(),
          stock: 0, // Initial stock is handled via movement logic
          tenantId,
        },
      });

      if (stock && stock > 0) {
        if (!warehouseId) {
          throw new BadRequestException('Warehouse ID is required for initial stock.');
        }

        // Log movement through WarehouseService (which now has tracing too)
        // Note: WarehouseService is not directly available here to avoid circularity if possible, 
        // but it's usually better to just use prisma/tx here.

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: product.id,
            warehouseId,
            quantity: stock,
            type: 'IN',
            reference: 'INITIAL-STOCK',
            notes: 'Initial stock on product creation',
            correlationId: data.correlationId || this.traceService.getCorrelationId(),
          },
        });

        await tx.stockLocation.upsert({
          where: {
            tenantId_productId_warehouseId_notes: {
              tenantId,
              productId: product.id,
              warehouseId,
              notes: '',
            },
          },
          create: {
            tenantId,
            productId: product.id,
            warehouseId,
            quantity: stock,
            notes: '',
          },
          update: {
            quantity: { increment: stock },
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stock },
        });

        // 4. Ledger Sync for Initial Stock
        const invAccount = await tx.account.findFirst({
          where: { tenantId, name: { in: AccountSelectors.INVENTORY } }
        });
        const equityAccount = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY }
        });

        if (invAccount && equityAccount) {
          const movementValue = new Decimal(product.costPrice as any || 0).mul(new Decimal(stock));
          await this.accounting.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Initial Stock: ${product.name}`,
            reference: `OB-${product.sku}`,
            correlationId: data.correlationId || this.traceService.getCorrelationId(),
            transactions: [
              { accountId: invAccount.id, type: 'Debit', amount: movementValue.toNumber(), description: 'Opening Stock Entry' },
              { accountId: equityAccount.id, type: 'Credit', amount: movementValue.toNumber(), description: 'Opening Stock Entry' }
            ]
          }, tx);
        }
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
          include: { warehouse: true }
        }
      }
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
          { name: { contains: code, mode: 'insensitive' } }
        ]
      },
      include: {
        stockLocations: {
          include: { warehouse: true }
        }
      }
    });
  }

  async updateProduct(tenantId: string, id: string, data: any, userId?: string) {
    return this.prisma.product.update({
      where: { id, tenantId } as any,
      data: {
        ...data,
        correlationId: data.correlationId || this.traceService.getCorrelationId(),
      }
    });
  }

  // Enforces absolute stock integrity.
  // Prevents any operation from setting stock below zero.
  validateStockFloor(productName: string, newStock: any) {
    if (new Decimal(newStock).lt(0)) {
      throw new BadRequestException(
        `Integrity Error: Stock for "${productName}" cannot go below zero. ` +
        `Current Transaction Attempted Value: ${newStock}`
      );
    }
  }

  /**
   * 100x Hardening: Atomic Stock Deduction
   * Uses a guarded update to ensure stock never goes negative even in concurrent race conditions.
   */
  async deductStock(tx: any, productId: string, warehouseId: string, quantity: number | Decimal, notes: string = '') {
    const amount = new Decimal(quantity);

    const result = await tx.stockLocation.updateMany({
      where: {
        productId,
        warehouseId,
        notes,
        quantity: { gte: amount } // THE GUARD
      },
      data: {
        quantity: { decrement: amount }
      }
    });

    if (result.count === 0) {
      throw new BadRequestException(`Insufficient stock or concurrent deduction lock for Product: ${productId} at Warehouse: ${warehouseId}`);
    }

    // Sync global product stock (also guarded)
    const productResult = await tx.product.updateMany({
      where: {
        id: productId,
        stock: { gte: amount }
      },
      data: {
        stock: { decrement: amount }
      }
    });

    if (productResult.count === 0) {
      throw new BadRequestException(`Global stock sync failed for Product: ${productId}. Possible concurrent state mismatch.`);
    }
  }

  async deleteProduct(tenantId: string, id: string) {
    return this.prisma.product.updateMany({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  async importProducts(tenantId: string, csvContent: string, options: { dryRun?: boolean; correlationId?: string } = {}) {
    const isDryRun = options.dryRun === true;
    let dryRunResults: any = null;

    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length > 501) {
      throw new BadRequestException('SME Stress Guard: Bulk import limited to 500 rows per batch to ensure transactional integrity.');
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
          preview: [] as any[]
        };

        const wh = await tx.warehouse.findFirst({ where: { tenantId } });
        if (!wh) throw new BadRequestException("Import Failed: No warehouse found. Create at least one warehouse first.");

        let totalOpeningValue = new Decimal(0);

        for (let i = 1; i < lines.length; i++) {
          results.total++;
          const cols = lines[i].split(',').map((c) => c.trim());
          const data: any = {};
          headers.forEach((h, idx) => {
            if (cols[idx]) data[h.toLowerCase()] = cols[idx];
          });

          try {
            const sku = data.sku || data.code;
            if (!sku) throw new Error('Missing SKU or Code');

            let product = await tx.product.findFirst({ where: { tenantId, sku } });
            const existing = !!product;

            const productPayload = {
              name: data.name || sku,
              sku,
              barcode: data.barcode || data.upc,
              description: data.description,
              basePrice: Number(data.price || data.baseprice) || 0,
              costPrice: Number(data.cost || data.costprice) || 0,
              gstRate: Number(data.gstrate || data.tax) || 18,
              hsnCode: data.hsncode || data.hsn,
              uom: data.uom || 'Unit',
              correlationId: options.correlationId || this.traceService.getCorrelationId(),
            };

            if (existing) {
              product = await tx.product.update({
                where: { id: product.id },
                data: productPayload
              });
              results.updated++;
            } else {
              product = await tx.product.create({
                data: { ...productPayload, tenantId }
              });
              results.created++;
            }

            // Handle initial stock in import
            const importStock = Number(data.stock || data.openingstock) || 0;
            if (importStock > 0) {
              await (tx as any).stockMovement.create({
                data: {
                  tenantId,
                  productId: product.id,
                  warehouseId: wh.id,
                  quantity: importStock,
                  type: 'IN',
                  reference: 'IMPORT-OB',
                  notes: 'Bulk import opening balance',
                  correlationId: options.correlationId || this.traceService.getCorrelationId(),
                }
              });

              await (tx as any).stockLocation.upsert({
                where: {
                  tenantId_productId_warehouseId_notes: {
                    tenantId,
                    productId: product.id,
                    warehouseId: wh.id,
                    notes: ''
                  }
                },
                create: {
                  tenantId,
                  productId: product.id,
                  warehouseId: wh.id,
                  quantity: importStock,
                  notes: ''
                },
                update: {
                  quantity: { increment: importStock }
                }
              });

              await tx.product.update({
                where: { id: product.id },
                data: { stock: { increment: importStock } }
              });

              const cost = Number(product.costPrice) || 0;
              totalOpeningValue = totalOpeningValue.add(new Decimal(cost).mul(importStock));
            }

            results.imported++;
            results.preview.push({
              action: existing ? 'UPDATE' : 'CREATE',
              name: product.name,
              sku: product.sku,
              gstRate: product.gstRate,
              stock: importStock
            });
          } catch (err: any) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              item: data.name || data.sku || data.barcode,
              message: err.message
            });
          }
        }

        if (totalOpeningValue.gt(0)) {
          const invAccount = await tx.account.findFirst({ where: { tenantId, name: { in: AccountSelectors.INVENTORY } } });
          const equityAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY } });

          if (invAccount && equityAccount) {
            await this.accounting.ledger.createJournalEntry(tenantId, {
              date: new Date().toISOString(),
              description: `Bulk Opening Stock Sync (${results.created + results.updated} items)`,
              reference: `IMPORT-OB-${Date.now()}`,
              correlationId: options.correlationId || this.traceService.getCorrelationId(),
              transactions: [
                { accountId: invAccount.id, type: 'Debit', amount: totalOpeningValue.toNumber(), description: 'Bulk Opening Stock Entry' },
                { accountId: equityAccount.id, type: 'Credit', amount: totalOpeningValue.toNumber(), description: 'Bulk Opening Stock Entry' }
              ]
            }, tx);
          }
        }

        if (isDryRun) {
          dryRunResults = results;
          throw new Error('DRY_RUN_ROLLBACK');
        }

        return results;
      });
      return finalResults;
    } catch (err: any) {
      if (err.message === 'DRY_RUN_ROLLBACK') {
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
        _sum: { stock: true }
      }),
      this.prisma.product.count({
        where: {
          tenantId,
          isDeleted: false,
          stock: { lt: 10 }
        }
      })
    ]);

    return {
      totalProducts,
      totalStock: totalStock._sum.stock || 0,
      lowStockCount: lowStock
    };
  }

  // --- Retail Depth: Multi-Store Pricing ---
  async updateLocationPrice(tenantId: string, productId: string, warehouseId: string, price: number) {
    return (this.prisma as any).warehousePrice.upsert({
      where: {
        tenantId_productId_warehouseId: { tenantId, productId, warehouseId }
      },
      update: { price },
      create: { tenantId, productId, warehouseId, price }
    });
  }

  async getLocationPrice(tenantId: string, productId: string, warehouseId: string) {
    const locPrice = await (this.prisma as any).warehousePrice.findUnique({
      where: {
        tenantId_productId_warehouseId: { tenantId, productId, warehouseId }
      }
    });

    if (locPrice) return locPrice.price;

    const product = await this.prisma.product.findUnique({
      where: { id: productId, tenantId }
    });
    return product?.price || 0;
  }

  // --- Retail Depth: Dynamic Markdown AI ---
  async getMarkdownSuggestions(tenantId: string) {
    const products = await (this.prisma.product as any).findMany({
      where: {
        tenantId,
        isDeleted: false,
        shelfLifeDays: { not: null }
      },
      include: {
        stockLocations: {
          where: { quantity: { gt: 0 } }
        }
      }
    });

    const suggestions = [];

    for (const product of products) {
      const shelfLifeDays = (product as any).shelfLifeDays;
      if (!shelfLifeDays) continue;

      for (const loc of (product as any).stockLocations) {
        const ageInDays = Math.floor((Date.now() - new Date(loc.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

        // 100x Logic: Dynamic Aging Calculus
        if (ageInDays > shelfLifeDays) {
          const discount = ageInDays > (shelfLifeDays * 1.5) ? 0.30 : 0.15; // 30% or 15% markdown
          const suggestedPrice = new Decimal(product.price).mul(1 - discount);

          suggestions.push({
            productId: product.id,
            productName: product.name,
            warehouseId: loc.warehouseId,
            currentAge: ageInDays,
            threshold: shelfLifeDays,
            suggestedDiscount: `${discount * 100}%`,
            suggestedPrice: suggestedPrice.toFixed(2),
            reason: `Stock is ${ageInDays} days old (Threshold: ${shelfLifeDays}). Aging markdown recommended.`
          });
        }
      }
    }

    return suggestions;
  }
}
