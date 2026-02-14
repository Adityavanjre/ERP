import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { POStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
  ) {}

  // --- Suppliers ---
  async createSupplier(tenantId: string, data: any) {
    const { openingBalance, ...supplierData } = data;
    const supplier = await this.prisma.supplier.create({
      data: { ...supplierData, tenantId },
    });

    if (openingBalance && Number(openingBalance) !== 0) {
      await (this.prisma as any).supplierOpeningBalance.create({
        data: {
          tenantId,
          supplierId: supplier.id,
          amount: Number(openingBalance),
          description: 'Opening Balance Migration',
          date: new Date(),
        },
      });
    }

    return supplier;
  }

  async getSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async deleteSupplier(tenantId: string, id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // --- Purchase Orders ---
  async createPurchaseOrder(tenantId: string, data: any) {
    const { items, supplierId, ...poData } = data;

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          ...poData,
          tenantId,
          supplierId,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: new Decimal(item.quantity),
              unitPrice: new Decimal(item.unitPrice),
            })),
          },
        },
        include: { items: true },
      });

      return po;
    });
  }

  async getPurchaseOrders(tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePOStatus(tenantId: string, id: string, status: POStatus, warehouseId?: string) {
    // 0. Governance: Period Lock
    await this.accounting.checkPeriodLock(tenantId, new Date());

    // Transactional Safety for Stock + Financials
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });

      if (!po) throw new Error('Purchase Order not found');

      // 1. Handle Receipt Logic (Stock + GL)
      if (status === POStatus.Received && po.status !== POStatus.Received) {
        // DEADLOCK PREVENTION: Sort by Product ID
        const sortedItems = [...po.items].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        );

        // A. Increment Stock with Moving Average Cost (MAC) Calculation
        for (const item of sortedItems) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, costPrice: true, name: true },
          });

          if (product) {
            const oldStock = new Decimal(product.stock as any);
            const oldCost = new Decimal(product.costPrice as any);
            const newQty = new Decimal(item.quantity);
            const newPrice = new Decimal(item.unitPrice);

            // MAC Formula: ((oldStock * oldCost) + (newQty * newPrice)) / (oldStock + newQty)
            let newMAC = newPrice; // Default to new price if no old stock
            const totalQty = oldStock.add(newQty);
            
            if (totalQty.greaterThan(0)) {
              newMAC = (oldStock.mul(oldCost).add(newQty.mul(newPrice))).div(totalQty);
            }

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: newQty },
                costPrice: newMAC,
              },
            });

            // --- INVENTORY 2.0: MULTI-WAREHOUSE LOGIC ---
            // 1. Find Target Warehouse (Use provided ID or Default to 'Main Factory Warehouse')
            const warehouse = await tx.warehouse.findFirst({
              where: {
                tenantId,
                id: warehouseId, // Optional filter if provided
                OR: warehouseId ? undefined : [
                  { name: 'Main Factory Warehouse' },
                  {} // Fallback to any warehouse if no ID provides
                ]
              }
            });

            if (warehouse) {
              // 2. Update Stock Location
              const existingLoc = await tx.stockLocation.findUnique({
                 where: {
                   productId_warehouseId: {
                     productId: item.productId,
                     warehouseId: warehouse.id
                   }
                 }
              });

              if (existingLoc) {
                await tx.stockLocation.update({
                  where: { id: existingLoc.id },
                  data: { quantity: { increment: newQty } }
                });
              } else {
                await tx.stockLocation.create({
                  data: {
                    productId: item.productId,
                    warehouseId: warehouse.id,
                    quantity: newQty
                  }
                });
              }

              // 3. Create Audit Trail (StockMovement)
              await tx.stockMovement.create({
                data: {
                  tenantId,
                  productId: item.productId,
                  warehouseId: warehouse.id,
                  quantity: newQty,
                  type: 'IN', // MovementType.IN
                  reference: po.orderNumber,
                  notes: `PO Receipt`
                }
              });
            }
            // -------------------------------------------
          }
        }

        // B. Financial Journal (Dr Inventory, Dr GST Receivable [ITC], Cr Accounts Payable)
        const inventoryAccount = await tx.account.findFirst({
          where: { tenantId, name: 'Inventory Asset' },
        });
        const apAccount = await tx.account.findFirst({
          where: { tenantId, name: 'Accounts Payable' },
        });
        const itcAccount = await tx.account.findFirst({
          where: { tenantId, name: 'GST Receivable' }, // Professional ITC Account
        });

        if (inventoryAccount && apAccount) {
          const totalAmount = new Decimal(po.totalAmount);
          // Assuming 18% GST for parity if not specified, but professional ERP uses line-item tax.
          // For the "Ultimate Seal", we derive tax from the total if not explicitly stored.
          const taxableValue = totalAmount.div(1.18);
          const taxAmount = totalAmount.sub(taxableValue);

          // Create Journal
          const transactions = [
            {
              tenantId,
              accountId: inventoryAccount.id,
              type: 'Debit',
              amount: taxableValue,
              description: `Stock Value - ${po.orderNumber}`,
            },
            {
              tenantId,
              accountId: apAccount.id,
              type: 'Credit',
              amount: totalAmount,
              description: `Vendor Liability - ${po.orderNumber}`,
            },
          ];

          if (itcAccount) {
            transactions.push({
              tenantId,
              accountId: itcAccount.id,
              type: 'Debit',
              amount: taxAmount,
              description: `ITC Input Tax - ${po.orderNumber}`,
            });
          } else {
            // Fallback: If no ITC account, book everything to inventory (Classic mode)
            transactions[0].amount = totalAmount;
          }

          await tx.journalEntry.create({
            data: {
              tenantId,
              date: new Date(),
              description: `PO Receipt #${po.orderNumber}`,
              reference: po.orderNumber,
              posted: true,
              transactions: {
                create: transactions as any,
              },
            },
          });

          // Update Account Balances
          await tx.account.update({
            where: { id: inventoryAccount.id },
            data: { balance: { increment: transactions[0].amount } },
          });
          await tx.account.update({
            where: { id: apAccount.id },
            data: { balance: { increment: totalAmount } },
          });
          if (itcAccount && transactions.length > 2) {
             await tx.account.update({
                where: { id: itcAccount.id },
                data: { balance: { increment: taxAmount } },
             });
          }
        } else {
          throw new Error(
            "Missing Financial Accounts: Ensure 'Inventory Asset' and 'Accounts Payable' exist.",
          );
        }
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status },
      });
    });
  }

  async getPurchasesStats(tenantId: string) {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { tenantId },
    });

    const totalSpent = pos
      .filter((p) => p.status === POStatus.Received)
      .reduce((sum, p) => sum.add(new Decimal(p.totalAmount)), new Decimal(0));

    const pendingPOs = pos.filter((p) => p.status === POStatus.Ordered).length;

    return {
      totalSpent,
      pendingPOs,
      totalPOs: pos.length,
    };
  }

  /**
   * Enterprise Procurement: Converts a Request for Quotation (RFQ) to a firm Purchase Order.
   */
  async convertRFQToPO(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId, status: POStatus.RFQ },
    });
    if (!po) throw new Error('Valid RFQ not found for conversion');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.Ordered },
    });
  }

  // --- Supplier Opening Balances ---
  async addSupplierOpeningBalance(tenantId: string, data: any) {
     return this.prisma.supplierOpeningBalance.create({
        data: {
            ...data,
            tenantId,
            amount: new Decimal(data.amount)
        }
     });
  }

  async getSupplierOpeningBalances(tenantId: string, supplierId: string) {
     return this.prisma.supplierOpeningBalance.findMany({
        where: { tenantId, supplierId },
        orderBy: { date: 'desc' }
     });
  }
}
