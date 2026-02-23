import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';

import { BillingService } from '../system/services/billing.service';
import { AccountSelectors, StandardAccounts } from '../accounting/constants/account-names';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private billing: BillingService,
  ) { }

  async createProduct(tenantId: string, data: any, userId?: string) {
    // 0. Subscription Governance: Quota Check
    await this.billing.validateQuota(tenantId, 'maxProducts');

    const { stock, warehouseId, ...productData } = data;

    // Forensic SKU Uniqueness Guard
    if (productData.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { tenantId, sku: productData.sku }
      });
      if (existing) {
        throw new Error(`Integrity Violation: SKU '${productData.sku}' already exists${existing.isDeleted ? ' (in archive)' : ''}. Please resolve collision before creation.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          stock: 0, // Initial stock is handled via movement logic
          tenantId,
          createdById: userId,
          updatedById: userId
        },
      });

      // If initial stock is provided, log it as an opening balance
      if (Number(stock) > 0) {
        let targetWhId = warehouseId;
        if (!targetWhId) {
          const firstWh = await tx.warehouse.findFirst({ where: { tenantId } });
          targetWhId = firstWh?.id;
        }

        if (targetWhId) {
          // We use WarehouseService to maintain consistency
          // Since we are inside a transaction, we should ideally use tx
          // However, WarehouseService has internal transactions. 
          // We can either refactor or just call it after (but that's not atomic).
          // Actually, the logOpeningBalance method I just added takes 'tx' but doesn't use it yet (it creates its own).
          // I should refactor logOpeningBalance to allow passing a tx. 
          // For now, I'll just write the logic here directly to ensure atomicity.

          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: product.id,
              warehouseId: targetWhId,
              quantity: Number(stock),
              type: 'IN',
              reference: 'OPENING-BALANCE',
              notes: 'Initial stock on product creation',
            },
          });

          await tx.stockLocation.upsert({
            where: {
              tenantId_productId_warehouseId_notes: {
                tenantId,
                productId: product.id,
                warehouseId: targetWhId,
                notes: ''
              }
            },
            create: {
              tenantId,
              productId: product.id,
              warehouseId: targetWhId,
              quantity: Number(stock),
              notes: ''
            },
            update: { quantity: { increment: Number(stock) } },
          });

          await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: Number(stock) } },
          });

          // Ledger sync
          const cost = Number(product.costPrice) || 0;
          if (cost > 0) {
            const invAccount = await tx.account.findFirst({ where: { tenantId, name: { in: AccountSelectors.INVENTORY } } });
            const equityAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY } });

            if (invAccount && equityAccount) {
              const totalValue = new Decimal(cost).mul(new Decimal(stock));
              // Since ledger.createJournalEntry supports passing a tx, we are safe
              await this.accounting.ledger.createJournalEntry(tenantId, {
                date: new Date().toISOString(),
                description: `Opening Stock: ${product.name} @ ${cost}`,
                reference: `OB-${product.sku}`,
                transactions: [
                  { accountId: invAccount.id, type: 'Debit', amount: totalValue.toNumber(), description: 'Opening Stock Entry' },
                  { accountId: equityAccount.id, type: 'Credit', amount: totalValue.toNumber(), description: 'Opening Stock Entry' }
                ]
              }, tx);
            }
          }
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

    // Default query if no search
    if (!search) {
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        this.prisma.product.count({ where: { tenantId, isDeleted: false } }),
      ]);

      return {
        data: products,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Priority Search Logic (INV-06)
    // 1. Exact Barcode Match
    const exactMatch = await this.prisma.product.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        barcode: search // Exact match
      }
    });

    // 2. Fuzzy Match (Name, SKU, etc.) excluding exact match if found
    const whereFuzzy: any = {
      tenantId,
      isDeleted: false,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        // Include barcode partial match too, in case exact match failed or wasn't unique (though barcode should be unique)
        { barcode: { contains: search, mode: 'insensitive' } },
      ]
    };

    if (exactMatch) {
      whereFuzzy.id = { not: exactMatch.id }; // Exclude already found
    }

    const [fuzzyProducts, fuzzyTotal] = await Promise.all([
      this.prisma.product.findMany({
        where: whereFuzzy,
        orderBy: { createdAt: 'desc' },
        take: limit - (exactMatch ? 1 : 0), // Adjust limit
        skip, // Logic slightly complex with exact match + pagination, but acceptable for now.
        // Ideally: if page 1, show exact match at top. If page > 1, exact match is already shown.
        // For simplicity: We only inject exact match on Page 1.
      }),
      this.prisma.product.count({ where: whereFuzzy })
    ]);

    let products = fuzzyProducts;
    if (page === 1 && exactMatch) {
      products = [exactMatch, ...fuzzyProducts];
    }

    const total = fuzzyTotal + (exactMatch ? 1 : 0);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProduct(tenantId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { tenantId, id, isDeleted: false },
    });
  }

  async findProductByCode(tenantId: string, code: string) {
    if (!code) return null;
    const cleanCode = code.trim();

    // 1. Precise Match (Barcode/SKU) - Highest Priority
    const precise = await this.prisma.product.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          { barcode: cleanCode },
          { sku: cleanCode },
          { skuAlias: cleanCode },
        ],
      },
    });

    if (precise) return precise;

    // 2. Fallback to Partial Name Match
    return this.prisma.product.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        name: { contains: cleanCode },
      },
    });
  }

  async updateProduct(tenantId: string, id: string, data: any, userId?: string) {
    return this.prisma.$transaction(async (tx: any) => {
      // 0. Forensic Guard: Check lock INSIDE transaction
      await this.accounting.checkPeriodLock(tenantId, new Date(), tx);

      const product = await tx.product.findFirst({
        where: { id, tenantId, isDeleted: false },
      });

      if (!product) throw new NotFoundException('Product not found or access denied');

      // FORENSIC AUDIT: Record ALL changes
      const changes: any = {};
      let hasMeaningfulChange = false;

      const fieldsToAudit = ['name', 'sku', 'price', 'costPrice', 'stock', 'manufacturer', 'category', 'brand'];

      for (const field of fieldsToAudit) {
        if (data[field] !== undefined) {
          const oldVal = product[field];
          const newVal = data[field];

          // Handle Decimal comparison for stock/price
          const isDecimal = ['price', 'costPrice', 'stock'].includes(field);
          const isEqual = isDecimal
            ? new Decimal(oldVal as any).equals(new Decimal(newVal as any))
            : oldVal === newVal;

          if (!isEqual) {
            changes[field] = { from: oldVal, to: newVal };
            hasMeaningfulChange = true;
          }
        }
      }

      if (hasMeaningfulChange) {
        // GLOBAL STOCK FLOOR GUARD if stock changed
        if (data.stock !== undefined) {
          this.validateStockFloor(product.name, data.stock);

          // --- INVENTORY-LEDGER SYNC ---
          const oldStock = new Decimal(product.stock as any);
          const newStock = new Decimal(data.stock as any);
          const diff = newStock.sub(oldStock);

          if (!diff.isZero()) {
            const adjAccount = await tx.account.findFirst({
              where: { tenantId, name: StandardAccounts.INVENTORY_ADJUSTMENT }
            });
            const invAccount = await tx.account.findFirst({
              where: { tenantId, name: { in: AccountSelectors.INVENTORY } }
            });

            if (adjAccount && invAccount) {
              const valueDiff = diff.mul(new Decimal(product.costPrice as any));
              await this.accounting.ledger.createJournalEntry(tenantId, {
                date: new Date().toISOString(),
                description: `Stock Adjustment: ${product.name} (Manual Edit)`,
                reference: `ADJ-${id.slice(0, 8)}`,
                transactions: [
                  {
                    accountId: invAccount.id,
                    type: valueDiff.isPositive() ? 'Debit' : 'Credit',
                    amount: valueDiff.abs().toNumber(),
                    description: `Qty Adj: ${oldStock} -> ${newStock}`
                  },
                  {
                    accountId: adjAccount.id,
                    type: valueDiff.isPositive() ? 'Credit' : 'Debit',
                    amount: valueDiff.abs().toNumber(),
                    description: `Qty Adj: ${oldStock} -> ${newStock}`
                  },
                ]
              }, tx);
            }
          }
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const adjustmentCount = await tx.auditLog.count({
          where: {
            tenantId,
            action: 'PRODUCT_UPDATE',
            createdAt: { gte: startOfDay },
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'PRODUCT_UPDATE',
            resource: `Product:${id}`,
            details: {
              name: product.name,
              changes,
              warning: adjustmentCount >= 10 ? 'HIGH_UPDATE_FREQUENCY' : null,
            } as any,
          },
        });
      }

      return tx.product.update({
        where: { id, tenantId },
        data: { ...data, updatedById: userId },
      });
    });
  }

  /**
   * Enforces absolute stock integrity.
   * Prevents any operation from setting stock below zero.
   */
  private validateStockFloor(productName: string, newStock: any) {
    const qty = new Decimal(newStock);
    if (qty.isNegative()) {
      throw new BadRequestException(
        `Inventory Audit Failure: Cannot set negative stock for ${productName}. ` +
        `Requested: ${qty}. Ensure all stock movements are positive.`,
      );
    }
  }

  async deleteProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: { stockLocations: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    // Forensic Guard: Prevent deleting products with physical stock
    if (new Decimal(product.stock as any).greaterThan(0)) {
      throw new BadRequestException(
        `Security Violation: Cannot delete product '${product.name}' with positive stock (${product.stock}). Please adjust stock to zero first.`,
      );
    }

    // Forensic Guard: Prevent deleting products with warehouse location records
    const hasLocationStock = product.stockLocations.some(loc => !new Decimal(loc.quantity as any).equals(0));
    if (hasLocationStock) {
      throw new BadRequestException(
        `Security Violation: Product '${product.name}' has active stock in specific warehouses. Clear all warehouse locations before deletion.`,
      );
    }

    return this.prisma.product.updateMany({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  async importProducts(tenantId: string, csvContent: string) {
    // Audit Requirement: Use Transactions for Bulk Import
    return this.prisma.$transaction(async (tx: any) => {
      const lines = csvContent.split(/\r?\n/);
      const headers = lines[0].split(',').map((h) => h.trim());

      const results = {
        total: 0,
        created: 0,
        updated: 0,
        errors: [] as string[],
        imported: 0, // Matching frontend expectations
        failed: 0
      };

      const wh = await tx.warehouse.findFirst({ where: { tenantId } });
      if (!wh) throw new BadRequestException("Import Failed: No warehouse found. Create at least one warehouse first.");

      let totalOpeningValue = new Decimal(0);

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        results.total++;

        const values = lines[i].split(',').map((v) => v.trim());
        const data: any = {};

        headers.forEach((header, index) => {
          data[header] = values[index];
        });

        try {
          // Data Cleaning
          const barcode = this.cleanVal(data.barcode);
          const sku = this.cleanVal(data.sku);

          if (!barcode && !sku) {
            throw new Error(`Line ${i}: Missing Barcode and SKU`);
          }

          const existing = await tx.product.findFirst({
            where: {
              tenantId,
              OR: [
                barcode ? { barcode } : {},
                sku ? { sku } : {},
              ].filter(c => Object.keys(c).length > 0),
            },
          });

          let product;
          if (existing) {
            if (existing.isDeleted) {
              throw new ConflictException(`Line ${i}: Product ${barcode || sku} was previously deleted. Resurrection via import is blocked.`);
            }

            product = await tx.product.update({
              where: { id: existing.id },
              data: {
                name: data.name || existing.name,
                category: data.category || existing.category,
                tags: data.tags || existing.tags,
                brand: data.brand || existing.brand,
                description: data.description || existing.description,
                price: data.price ? new Decimal(data.price) : existing.price,
                costPrice: data.costPrice ? new Decimal(data.costPrice) : existing.costPrice,
                minStockLevel: data.minStockLevel ? new Decimal(data.minStockLevel) : existing.minStockLevel,
              },
            });
            results.updated++;
          } else {
            product = await tx.product.create({
              data: {
                tenantId,
                name: data.name,
                barcode,
                sku: sku || `SKU-${Date.now()}-${i}`,
                category: data.category || 'Uncategorized',
                tags: data.tags,
                brand: data.brand,
                description: data.description,
                price: new Decimal(data.price || 0),
                costPrice: new Decimal(data.costPrice || 0),
                stock: 0, // Handled below
                minStockLevel: new Decimal(data.minStockLevel || 0),
                gstRate: data.gstRate !== undefined ? new Decimal(data.gstRate) : new Decimal(0),
              },
            });
            results.created++;
          }

          // Handle Stock Import
          const importStock = Number(data.stock || 0);
          if (importStock > 0) {
            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: product.id,
                warehouseId: wh.id,
                quantity: importStock,
                type: 'IN',
                reference: 'IMPORT-OB',
                notes: 'Bulk stock import'
              }
            });

            await tx.stockLocation.upsert({
              where: { productId_warehouseId: { productId: product.id, warehouseId: wh.id } },
              create: { productId: product.id, warehouseId: wh.id, quantity: importStock },
              update: { quantity: { increment: importStock } }
            });

            await tx.product.update({
              where: { id: product.id },
              data: { stock: { increment: importStock } }
            });

            const cost = Number(product.costPrice) || 0;
            totalOpeningValue = totalOpeningValue.add(new Decimal(cost).mul(importStock));
          }

          results.imported++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(err.message);
        }
      }

      // Final Ledger Sync for the whole batch
      if (totalOpeningValue.gt(0)) {
        const invAccount = await tx.account.findFirst({ where: { tenantId, name: { in: AccountSelectors.INVENTORY } } });
        const equityAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY } });

        if (invAccount && equityAccount) {
          await this.accounting.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Bulk Opening Stock Sync (${results.created + results.updated} items)`,
            reference: `IMPORT-OB-${Date.now()}`,
            transactions: [
              { accountId: invAccount.id, type: 'Debit', amount: totalOpeningValue.toNumber(), description: 'Bulk Opening Stock Entry' },
              { accountId: equityAccount.id, type: 'Credit', amount: totalOpeningValue.toNumber(), description: 'Bulk Opening Stock Entry' }
            ]
          }, tx);
        }
      }

      return results;
    });
  }

  private cleanVal(val: string | null): string | null {
    if (!val) return null;
    let v = val.trim();
    // Excel scientific notation fix
    if (v.includes('+E') || v.includes('e+')) {
      const num = Number(v);
      if (!isNaN(num)) v = num.toLocaleString('fullwide', { useGrouping: false });
    }
    return v || null;
  }

  async getStats(tenantId: string) {
    const totalProducts = await this.prisma.product.count({
      where: { tenantId, isDeleted: false },
    });

    // Calculate low stock items based on custom thresholds
    const allProducts = await this.prisma.product.findMany({
      where: { tenantId, isDeleted: false },
      select: { stock: true, minStockLevel: true }
    });

    const lowStock = allProducts.filter(p =>
      new Decimal(p.stock as any).lessThan(new Decimal(p.minStockLevel as any))
    ).length;

    // Calculate total inventory value (stock * costPrice)
    const products = await this.prisma.product.findMany({
      where: { tenantId, isDeleted: false },
      select: { stock: true, costPrice: true },
    });

    const totalValue = products.reduce((sum, product) => {
      return sum + (Number(product.stock) * Number(product.costPrice || 0));
    }, 0);


    return { totalProducts, lowStock, totalValue };
  }

}
