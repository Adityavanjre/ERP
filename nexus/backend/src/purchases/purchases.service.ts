import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { POStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountingService } from '../accounting/accounting.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { StandardAccounts } from '../accounting/constants/account-names';
import { TdsService } from '../accounting/services/tds.service';
import { TraceService } from '../common/services/trace.service';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private ledger: LedgerService,
    private tds: TdsService,
    private readonly traceService: TraceService,
  ) { }

  // --- Suppliers ---
  async createSupplier(tenantId: string, data: any) {
    const { openingBalance, ...supplierData } = data;
    const supplier = await this.prisma.supplier.create({
      data: { ...supplierData, tenantId },
    });

    if (openingBalance && Number(openingBalance) !== 0) {
      await this.prisma.$transaction(async (tx) => {
        await this.accounting.ledger.checkPeriodLock(tenantId, new Date(), tx);

        const obAmount = this.ledger.round2(openingBalance);
        await tx.supplierOpeningBalance.create({
          data: {
            tenantId,
            supplierId: supplier.id,
            amount: obAmount,
            description: 'Opening Balance Migration',
            date: new Date(),
          },
        });

        // GL Journal: Dr Opening Balance Equity / Cr Accounts Payable
        const apAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE } });
        const obAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY } });

        if (apAcc && obAcc) {
          await this.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Opening Balance: ${supplier.name}`,
            reference: `OB-${supplier.id.slice(0, 8)}`,
            transactions: [
              { accountId: obAcc.id, type: 'Debit', amount: obAmount.abs().toNumber(), description: 'Supplier Opening Balance' },
              { accountId: apAcc.id, type: 'Credit', amount: obAmount.abs().toNumber(), description: 'Supplier Opening Balance' },
            ],
          }, tx);
        }
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
    return this.prisma.supplier.updateMany({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  async updateSupplier(tenantId: string, id: string, data: any) {
    return this.prisma.supplier.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  /**
   * Forensic Bulk Import for Suppliers
   * Rule: No silent liabilities.
   */
  async importSuppliers(tenantId: string, csvContent: string) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const results = { total: lines.length - 1, imported: 0, failed: 0, errors: [] as string[] };
    let aggregateAP = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(',').map(c => c.trim());
      const data: any = {};
      headers.forEach((h, idx) => { data[h] = cols[idx]; });

      try {
        await this.prisma.$transaction(async (tx) => {
          const name = data.name;
          const email = data.email;
          if (!name) throw new Error("Supplier Name is required");

          const existing = await tx.supplier.findFirst({
            where: { tenantId, name, isDeleted: false }
          });

          let supplierId = existing?.id;
          const supplierPayload = {
            name,
            email,
            phone: data.phone || '',
            company: data.company || '',
            address: data.address || '',
            gstin: data.gstin || null,
            isDeleted: false
          };

          if (existing) {
            await tx.supplier.update({ where: { id: existing.id }, data: supplierPayload });
          } else {
            const newS = await tx.supplier.create({ data: { ...supplierPayload, tenantId } });
            supplierId = newS.id;
          }

          const ob = parseFloat(data.openingBalance) || 0;
          if (ob !== 0 && supplierId) {
            const existingOB = await tx.supplierOpeningBalance.findFirst({ where: { tenantId, supplierId } });
            if (!existingOB) {
              await tx.supplierOpeningBalance.create({
                data: { tenantId, supplierId, amount: ob, description: 'Bulk Import', date: new Date(), correlationId: this.traceService.getCorrelationId() } as any
              });
              aggregateAP += ob;
            }
          }
        });
        results.imported++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Row ${i}: ${e.message}`);
      }
    }

    // Ledger Sync: Restore Liability integrity
    if (aggregateAP !== 0) {
      const apAcc = await this.prisma.account.findFirst({ where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE } });
      const obAcc = await this.prisma.account.findFirst({ where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY } });

      if (apAcc && obAcc) {
        await this.ledger.createJournalEntry(tenantId, {
          date: new Date().toISOString(),
          description: `Bulk Import Sync: ${results.imported} Suppliers`,
          reference: 'SYS-IMPORT-SUPP',
          transactions: [
            { accountId: obAcc.id, type: 'Debit', amount: Math.abs(aggregateAP), description: 'Bulk OB' },
            { accountId: apAcc.id, type: 'Credit', amount: Math.abs(aggregateAP), description: 'Bulk OB' }
          ],
          correlationId: this.traceService.getCorrelationId()
        });
      }
    }

    return results;
  }

  // --- Purchase Orders ---
  async createPurchaseOrder(tenantId: string, data: any) {
    const { items, supplierId, ...poData } = data;

    return this.prisma.$transaction(async (tx) => {
      if (data.idempotencyKey) {
        const existing = await tx.purchaseOrder.findFirst({
          where: { tenantId, idempotencyKey: data.idempotencyKey } as any,
          include: { items: true },
        });
        if (existing) return existing;
      }

      await this.ledger.checkPeriodLock(tenantId, data.orderDate || new Date(), tx);

      const [tenant, supplier] = await Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId } }),
        tx.supplier.findUnique({ where: { id: supplierId } }),
      ]);

      const autoInterState = tenant?.state?.trim().toLowerCase() !== supplier?.state?.trim().toLowerCase();
      const isInterState = data.isInterState !== undefined ? data.isInterState : autoInterState;

      // Compute GST per item
      let totalTaxable = new Decimal(0);
      let totalGST = new Decimal(0);
      let totalCGST = new Decimal(0);
      let totalSGST = new Decimal(0);
      let totalIGST = new Decimal(0);

      const enrichedItems = await Promise.all(
        items.map(async (item: any) => {
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId, isDeleted: false },
            select: { gstRate: true, hsnCode: true },
          });
          const qty = new Decimal(item.quantity);
          const unitPrice = new Decimal(item.unitPrice);
          const taxable = this.ledger.round2(qty.mul(unitPrice));
          const gstRate = new Decimal(product?.gstRate || item.gstRate || 0);
          const gstAmount = this.ledger.round2(taxable.mul(gstRate).div(100));

          const cgst = isInterState ? new Decimal(0) : gstAmount.div(2).toDecimalPlaces(2, Decimal.ROUND_DOWN);
          const sgst = isInterState ? new Decimal(0) : gstAmount.sub(cgst);
          const igst = isInterState ? gstAmount : new Decimal(0);

          totalTaxable = totalTaxable.add(taxable);
          totalGST = totalGST.add(gstAmount);
          totalCGST = totalCGST.add(cgst);
          totalSGST = totalSGST.add(sgst);
          totalIGST = totalIGST.add(igst);

          return {
            tenantId,
            productId: item.productId,
            hsnCode: product?.hsnCode || item.hsnCode || null,
            quantity: qty,
            unitPrice,
            taxableAmount: taxable,
            gstRate,
            cgstAmount: cgst,
            sgstAmount: sgst,
            igstAmount: igst,
            totalAmount: this.ledger.round2(taxable.add(gstAmount)),
          };
        }),
      );

      const grandTotal = this.ledger.round2(totalTaxable.add(totalGST));

      const poCount = await tx.purchaseOrder.count({ where: { tenantId } });
      const orderNumber = data.orderNumber || `PO-${(poCount + 1).toString().padStart(4, '0')}`;

      const po = await tx.purchaseOrder.create({
        data: {
          ...poData,
          tenantId,
          supplierId,
          orderNumber,
          tdsSection: poData.tdsSection,
          totalAmount: grandTotal,
          totalTaxable: this.ledger.round2(totalTaxable),
          totalGST: this.ledger.round2(totalGST),
          totalCGST: this.ledger.round2(totalCGST),
          totalSGST: this.ledger.round2(totalSGST),
          totalIGST: this.ledger.round2(totalIGST),
          items: { create: enrichedItems },
        },
        include: { items: true },
      });

      return po;
    });
  }


  async getPurchaseOrders(tenantId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { tenantId },
        include: {
          supplier: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      this.prisma.purchaseOrder.count({ where: { tenantId } }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updatePOStatus(tenantId: string, id: string, status: POStatus, warehouseId?: string) {
    // 0. Governance: Period Lock
    await this.accounting.checkPeriodLock(tenantId, new Date());

    // Transactional Safety for Stock + Financials
    return this.prisma.$transaction(async (tx) => {
      // 0. Audit Guard
      await this.accounting.ledger.checkPeriodLock(tenantId, new Date(), tx);

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
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId, isDeleted: false },
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

            await tx.product.updateMany({
              where: { id: item.productId, tenantId },
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
                  { name: 'Main Warehouse' },
                  {} // Fallback to any warehouse if no ID provides
                ]
              }
            });

            if (warehouse) {
              // 2. Update Stock Location
              const existingLoc = await tx.stockLocation.findUnique({
                where: {
                  tenantId_productId_warehouseId_notes: {
                    tenantId,
                    productId: item.productId,
                    warehouseId: warehouse.id,
                    notes: ''
                  }
                } as any
              });

              if (existingLoc) {
                await tx.stockLocation.update({
                  where: { id: existingLoc.id },
                  data: { quantity: { increment: newQty } }
                });
              } else {
                await tx.stockLocation.create({
                  data: {
                    tenantId,
                    productId: item.productId,
                    warehouseId: warehouse.id,
                    quantity: newQty,
                    notes: ''
                  } as any
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
                  notes: `PO Receipt`,
                  correlationId: this.traceService.getCorrelationId()
                } as any
              });
            }
            // -------------------------------------------
          }
        }

        // B. Financial Journal (Dr Inventory, Dr GST Receivable [ITC], Cr Accounts Payable, Cr TDS Payable)
        const inventoryAccount = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.INVENTORY_ASSET },
        });
        const apAccount = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE },
        });
        const itcAccount = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.GST_RECEIVABLE },
        });

        if (inventoryAccount && apAccount) {
          const taxableValue = new Decimal(po.totalAmount).sub(new Decimal(po.totalGST || 0));
          const taxAmount = new Decimal(po.totalGST || 0);
          const totalAmount = new Decimal(po.totalAmount);

          // TDS Logic
          let tdsAmount = new Decimal(0);
          let netAmount = totalAmount;
          let ruleId: string | undefined;

          const supplier = await tx.supplier.findFirst({ where: { id: po.supplierId, tenantId } });
          const poAny = po as any;
          const activeTdsSection = poAny.tdsSection || (supplier as any)?.defaultTdsSection;

          if (activeTdsSection) {
            const res = await this.tds.calculateTds(tenantId, po.supplierId, activeTdsSection, totalAmount.toNumber());
            tdsAmount = res.tdsAmount;
            netAmount = res.netAmount;
            ruleId = res.ruleId;
          }

          const transactions = [
            { accountId: inventoryAccount.id, type: 'Debit' as any, amount: taxableValue.toNumber(), description: `Stock Value - ${po.orderNumber}` },
            { accountId: apAccount.id, type: 'Credit' as any, amount: netAmount.toNumber(), description: `Vendor Liability (Net of TDS) - ${po.orderNumber}` },
          ];

          if (itcAccount && taxAmount.greaterThan(0)) {
            transactions.push({ accountId: itcAccount.id, type: 'Debit' as any, amount: taxAmount.toNumber(), description: `ITC Claim - ${po.orderNumber}` });
          }

          if (tdsAmount.greaterThan(0)) {
            const tdsPayableAccount = await tx.account.findFirst({
              where: { tenantId, name: StandardAccounts.TDS_PAYABLE },
            });
            if (!tdsPayableAccount) throw new Error(`Missing '${StandardAccounts.TDS_PAYABLE}' account.`);
            transactions.push({ accountId: tdsPayableAccount.id, type: 'Credit' as any, amount: tdsAmount.toNumber(), description: `TDS Deducted (${poAny.tdsSection})` });

            // Record TDS Transaction
            if (ruleId) {
              await this.tds.recordTdsTransaction(tenantId, {
                ruleId,
                supplierId: po.supplierId,
                amount: totalAmount,
                tdsAmount,
                purchaseOrderId: po.id,
                date: new Date(),
              }, tx);
            }
          }

          // Use LedgerService for atomic update and balance synchronization
          await this.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Purchase Receipt: ${po.orderNumber}`,
            reference: po.orderNumber,
            transactions,
            correlationId: this.traceService.getCorrelationId()
          }, tx);

          // Update PO with TDS info
          await (tx.purchaseOrder as any).update({
            where: { id: po.id },
            data: { tdsAmount, netAmount, status } as any
          });
        } else {
          throw new Error(
            "Missing Financial Accounts: Ensure 'Inventory Asset' and 'Accounts Payable' exist.",
          );
        }
      }

      // 2. Handle Reversal Logic (Status change FROM Received TO Cancelled)
      if (status === POStatus.Cancelled && po.status === POStatus.Received) {
        for (const item of po.items) {
          // A. Decrement Stock
          await tx.product.updateMany({
            where: { id: item.productId, tenantId },
            data: { stock: { decrement: item.quantity } }
          });

          // B. Find where it was received (Auditor search)
          const movement = await tx.stockMovement.findFirst({
            where: {
              tenantId,
              productId: item.productId,
              reference: po.orderNumber,
              type: 'IN'
            }
          });

          if (movement) {
            await tx.stockLocation.updateMany({
              where: { productId: item.productId, warehouseId: movement.warehouseId, warehouse: { tenantId } },
              data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: item.productId,
                warehouseId: movement.warehouseId,
                quantity: item.quantity,
                type: 'OUT',
                reference: `CAN-${po.orderNumber}`,
                notes: `PO Cancellation Reversal`,
                correlationId: this.traceService.getCorrelationId()
              } as any
            });
          }
        }

        // C. Financial Reversal (Credit Inventory, Debit Accounts Payable)
        const inventoryAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.INVENTORY_ASSET } });
        const apAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE } });
        const itcAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.GST_RECEIVABLE } });

        if (inventoryAccount && apAccount) {
          const taxableValue = new Decimal(po.totalTaxable || 0);
          const taxAmount = new Decimal(po.totalGST || 0);
          const totalAmount = new Decimal(po.totalAmount);

          const transactions = [
            { accountId: inventoryAccount.id, type: 'Credit' as any, amount: taxableValue.toNumber(), description: `Reverse: Stock Value - ${po.orderNumber}` },
            { accountId: apAccount.id, type: 'Debit' as any, amount: totalAmount.toNumber(), description: `Reverse: Vendor Liability - ${po.orderNumber}` },
          ];

          if (itcAccount && taxAmount.greaterThan(0)) {
            transactions.push({ accountId: itcAccount.id, type: 'Credit' as any, amount: taxAmount.toNumber(), description: `Reverse: ITC Claim - ${po.orderNumber}` });
          }

          await this.ledger.createJournalEntry(tenantId, {
            date: new Date().toISOString(),
            description: `Cancellation of Purchase #${po.orderNumber}`,
            reference: `CAN-${po.orderNumber}`,
            transactions,
            correlationId: this.traceService.getCorrelationId()
          }, tx);
        }
      }

      return tx.purchaseOrder.updateMany({
        where: { id, tenantId },
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

    return this.prisma.purchaseOrder.updateMany({
      where: { id, tenantId },
      data: { status: POStatus.Ordered },
    });
  }

  // --- Supplier Opening Balances ---
  async addSupplierOpeningBalance(tenantId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const ob = await tx.supplierOpeningBalance.create({
        data: {
          ...data,
          tenantId,
          amount: new Decimal(data.amount)
        }
      });

      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });

      // GL Journal: Dr Opening Balance Equity / Cr Accounts Payable
      const apAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE } });
      const obAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY } });

      const obAmount = this.ledger.round2(ob.amount);
      if (apAcc && obAcc) {
        await this.ledger.createJournalEntry(tenantId, {
          date: new Date(data.date || new Date()).toISOString(),
          description: `Opening Balance Adjustment: ${supplier?.name || ''}`,
          reference: `OB-${ob.id.slice(0, 8)}`,
          transactions: [
            { accountId: obAcc.id, type: 'Debit', amount: obAmount.abs().toNumber(), description: 'Opening Balance Entry' },
            { accountId: apAcc.id, type: 'Credit', amount: obAmount.abs().toNumber(), description: 'Opening Balance Entry' },
          ],
        }, tx);
      }

      return ob;
    });
  }

  async getSupplierOpeningBalances(tenantId: string, supplierId: string) {
    return this.prisma.supplierOpeningBalance.findMany({
      where: { tenantId, supplierId },
      orderBy: { date: 'desc' }
    });
  }
}
