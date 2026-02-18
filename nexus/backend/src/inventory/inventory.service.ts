import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';

import { BillingService } from '../kernel/services/billing.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private billing: BillingService,
  ) {}

  async createProduct(tenantId: string, data: any) {
    // 0. Subscription Governance: Quota Check
    await this.billing.validateQuota(tenantId, 'maxProducts');

    // Forensic SKU Uniqueness Guard
    if (data.sku) {
        const existing = await this.prisma.product.findFirst({
            where: { tenantId, sku: data.sku }
        });
        if (existing) {
            throw new Error(`Integrity Violation: SKU '${data.sku}' already exists${existing.isDeleted ? ' (in archive)' : ''}. Please resolve collision before creation.`);
        }
    }

    return this.prisma.product.create({
      data: { ...data, tenantId },
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

  async updateProduct(tenantId: string, id: string, data: any) {
    return this.prisma.$transaction(async (tx: any) => {
      // 0. Forensic Guard: Check lock INSIDE transaction
      await this.accounting.checkPeriodLock(tenantId, new Date(), tx);

      const product = await tx.product.findFirst({
        where: { id, tenantId, isDeleted: false },
      });

      if (
        data.stock !== undefined &&
        product &&
        !new Decimal(product.stock as any).equals(new Decimal(data.stock))
      ) {
        // GLOBAL STOCK FLOOR GUARD
        this.validateStockFloor(product.name, data.stock);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const adjustmentCount = await tx.auditLog.count({
          where: {
            tenantId,
            action: 'STOCK_ADJUSTMENT',
            createdAt: { gte: startOfDay },
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'STOCK_ADJUSTMENT',
            resource: `Product:${id}`,
            details: {
              name: product.name,
              prevStock: product.stock,
              newStock: data.stock,
              diff: new Decimal(data.stock).sub(new Decimal(product.stock as any)),
              warning: adjustmentCount >= 3 ? 'HIGH_ADJUSTMENT_FREQUENCY' : null,
            } as any,
          },
        });
      }

      return tx.product.update({
        where: { id, tenantId },
        data,
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
      };

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

          if (existing) {
            // Audit Requirement: Prevent resurrection of deleted inventory via import
            if (existing.isDeleted) {
               throw new ConflictException(`Line ${i}: Product ${barcode || sku} was previously deleted. Resurrection via import is blocked for high security compliance. Please restore manually.`);
            }

            await tx.product.updateMany({
              where: { id: existing.id, tenantId },
              data: {
                name: data.name || existing.name,
                category: data.category || existing.category,
                tags: data.tags || existing.tags,
                brand: data.brand || existing.brand,
                description: data.description || existing.description,
                price: data.price ? new Decimal(data.price) : existing.price,
                stock: data.stock ? { increment: new Decimal(data.stock) as any } : undefined,
                minStockLevel: data.minStockLevel ? new Decimal(data.minStockLevel) : existing.minStockLevel,
              },
            });
            results.updated++;
          } else {
            await tx.product.create({
              data: {
                tenantId,
                name: data.name,
                barcode,
                sku: sku || `SKU-${Date.now()}`,
                category: data.category || 'Uncategorized',
                tags: data.tags,
                brand: data.brand,
                description: data.description,
                price: new Decimal(data.price || 0),
                stock: new Decimal(data.stock || 0) as any,
                minStockLevel: new Decimal(data.minStockLevel || 0),
                gstRate: new Decimal(data.gstRate || 18),
              },
            });
            results.created++;
          }
        } catch (err: any) {
          results.errors.push(err.message);
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

    // Calculate total inventory value (stock * price)
    const products = await this.prisma.product.findMany({
      where: { tenantId, isDeleted: false },
      select: { stock: true, price: true },
    });

    const totalValue = products.reduce((sum, product) => {
      return sum + (Number(product.stock) * Number(product.price || 0));
    }, 0);


    return { totalProducts, lowStock, totalValue };
  }

}
