import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, AccountType, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

  async createInvoice(
    tenantId: string,
    data: any,
    txOverride?: any,
    deductStock: boolean = true,
  ) {
    const { items, customerId, dueDate, idempotencyKey } = data;

    const runInTransaction = async (tx: any) => {
      if (idempotencyKey) {
        const existing = await (tx.invoice as any).findFirst({
          where: { idempotencyKey, tenantId },
          include: { items: true },
        });
        if (existing) return existing;
      }

      await this.ledger.checkPeriodLock(tenantId, data.issueDate || new Date(), tx);

      let totalTaxable = new Decimal(0);
      let totalGST = new Decimal(0);
      let totalCGST = new Decimal(0);
      let totalSGST = new Decimal(0);
      let totalIGST = new Decimal(0);
      let grandTotal = new Decimal(0);
      let totalCOGS = new Decimal(0);
      const invoiceItemsData = [];

      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      const customer = await tx.customer.findFirst({
        where: { id: customerId, tenantId, isDeleted: false },
      });

      const isInterState =
        tenant?.state &&
        customer?.state &&
        tenant.state.toLowerCase() !== customer.state.toLowerCase();

      const sortedItems = [...items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );

      for (const item of sortedItems) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId, isDeleted: false },
        });
        if (!product)
          throw new NotFoundException(`Product ${item.productId} not found`);

        const qty = new Decimal(item.quantity);
        const unitPrice = this.ledger.round2(item.price);

        if (qty.isZero()) {
            throw new BadRequestException(`Invalid quantity for ${product.name}: Zero not allowed.`);
        }
        if (unitPrice.isNegative() || unitPrice.isZero()) {
             throw new BadRequestException(`Invalid price for ${product.name}: ${unitPrice}. Must be positive.`);
        }

        if (deductStock) {
          const stockGuard = qty.isPositive() ? { gte: qty } : {};
          const updateResult = await tx.product.updateMany({
            where: {
              id: item.productId,
              tenantId,
              stock: stockGuard,
            },
            data: { stock: { decrement: qty } },
          });

          if (updateResult.count === 0) {
            const p = await tx.product.findFirst({
              where: { id: item.productId, tenantId },
            });
            throw new BadRequestException(
              `Insufficient stock for ${product.name}. Requested: ${qty}, Available: ${p?.stock}`,
            );
          }

          // --- INVENTORY 2.0: MULTI-WAREHOUSE DEDUCTION ---
          // 1. Find Source Warehouse (Default to 'Main Factory Warehouse' or first available)
          const warehouse = await tx.warehouse.findFirst({
            where: {
              tenantId,
              OR: [
                { name: 'Main Factory Warehouse' },
                {} // Fallback
              ]
            }
          });

          if (warehouse) {
            // 2. Decrement Stock Location
            const existingLoc = await tx.stockLocation.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: warehouse.id,
                },
              },
            });

            if (existingLoc) {
              await tx.stockLocation.updateMany({
                where: { id: existingLoc.id, warehouse: { tenantId } },
                data: { quantity: { decrement: qty } }
              });
            } else {
              // Create negative entry if allowed by global settings, but here we just ensure consistency
              await tx.stockLocation.create({
                data: {
                  productId: item.productId,
                  warehouseId: warehouse.id,
                  quantity: qty.negated()
                }
              });
            }

            // 3. Create Audit Trail (StockMovement)
            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: item.productId,
                warehouseId: warehouse.id,
                quantity: qty,
                type: 'OUT', // MovementType.OUT
                reference: data.invoiceNumber || 'NEW_INV',
                notes: `Invoice Sale`
              }
            });
          }
        }

        const gstRate = new Decimal(product.gstRate || 0);
        const taxable = this.ledger.round2(qty.mul(unitPrice));
        const taxAmount = this.ledger.round2(taxable.mul(gstRate).div(100));

        totalTaxable = totalTaxable.add(taxable);
        totalGST = totalGST.add(taxAmount);

        // COGS Accumulation
        const costPrice = new Decimal(product.costPrice || 0);
        totalCOGS = totalCOGS.add(costPrice.mul(qty));

        let itemCgstAmount = new Decimal(0);
        let itemSgstAmount = new Decimal(0);
        let itemIgstAmount = new Decimal(0);

        if (isInterState) {
          totalIGST = totalIGST.add(taxAmount);
          itemIgstAmount = taxAmount;
        } else {
          totalCGST = totalCGST.add(taxAmount.div(2));
          totalSGST = totalSGST.add(taxAmount.div(2));
          itemCgstAmount = taxAmount.div(2);
          itemSgstAmount = taxAmount.div(2);
        }

        invoiceItemsData.push({
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsnCode || null,
          quantity: qty,
          unitPrice: unitPrice,
          gstRate: gstRate,
          taxableAmount: taxable,
          gstAmount: taxAmount,
          cgstAmount: itemCgstAmount,
          sgstAmount: itemSgstAmount,
          igstAmount: itemIgstAmount,
          totalAmount: this.ledger.round2(taxable.add(taxAmount)),
        });
      }

      totalTaxable = this.ledger.round2(totalTaxable);
      totalGST = this.ledger.round2(totalGST);
      totalCGST = this.ledger.round2(totalCGST);
      totalSGST = this.ledger.round2(totalSGST);
      totalIGST = this.ledger.round2(totalIGST);
      grandTotal = this.ledger.round2(totalTaxable.add(totalGST));

      const invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;
      const existingInvoice = await tx.invoice.findFirst({
        where: { tenantId, invoiceNumber },
      });
      if (existingInvoice) {
        throw new BadRequestException(
          `Invoice number ${invoiceNumber} already exists for this tenant.`,
        );
      }

      const issueDate = new Date(data.issueDate || new Date());
      const amountPaidAtStart = new Decimal(data.amountPaid || 0);

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          customerId,
          invoiceNumber,
          issueDate: issueDate,
          dueDate: new Date(dueDate),
          totalAmount: grandTotal,
          totalTaxable,
          totalGST,
          totalCGST,
          totalSGST,
          totalIGST,
          amountPaid: amountPaidAtStart,
          idempotencyKey: data.idempotencyKey,
          status:
            amountPaidAtStart.greaterThanOrEqualTo(grandTotal)
              ? InvoiceStatus.Paid
              : amountPaidAtStart.greaterThan(0)
                ? InvoiceStatus.Partial
                : InvoiceStatus.Unpaid,
          billingTimeSeconds: data.billingTimeSeconds,
          items: {
            create: invoiceItemsData,
          },
        },
        include: { items: true },
      });

      if (amountPaidAtStart.greaterThan(0)) {
        await tx.payment.create({
          data: {
            tenantId,
            customerId,
            invoiceId: invoice.id,
            amount: amountPaidAtStart,
            date: issueDate,
            mode: data.paymentMode || 'Cash',
            reference: `Initial-POS-${invoiceNumber}`,
            notes: 'POS Rapid Billing Payment',
          },
        });
      }

      const arAccount = await tx.account.findFirst({
        where: { tenantId, type: AccountType.Asset, name: 'Accounts Receivable' },
      });
      const revenueAccount = await tx.account.findFirst({
        where: { tenantId, type: AccountType.Revenue, name: { contains: 'Sales' } },
      });
      const taxAccount = await tx.account.findFirst({
        where: { tenantId, type: AccountType.Liability, name: 'GST Payable' },
      });

      if (!arAccount || !revenueAccount)
        throw new BadRequestException('Ledger Configuration Error: Missing Accounts.');

      const transactionsList = [
        { accountId: arAccount.id, type: 'Debit', amount: grandTotal },
        { accountId: revenueAccount.id, type: 'Credit', amount: totalTaxable },
      ];

      if (amountPaidAtStart.greaterThan(0)) {
        const bankAccount = await tx.account.findFirst({
          where: { tenantId, type: AccountType.Asset, name: 'Bank' },
        });
        if (bankAccount) {
            transactionsList.push({ accountId: bankAccount.id, type: 'Debit', amount: amountPaidAtStart });
            transactionsList.push({ accountId: arAccount.id, type: 'Credit', amount: amountPaidAtStart });
        }
      }

      if (totalGST.greaterThan(0) && taxAccount) {
        transactionsList.push({ accountId: taxAccount.id, type: 'Credit', amount: totalGST });
      }

      // COGS Ledger Entry
      if (totalCOGS.greaterThan(0)) {
         const cogsAccount = await tx.account.findFirst({
            where: { tenantId, type: AccountType.Expense, name: 'Cost of Goods Sold' },
         });
         const inventoryAccount = await tx.account.findFirst({
            where: { 
                tenantId, 
                type: AccountType.Asset, 
                name: { in: ['Inventory', 'Inventory Asset', 'Finished Goods Inventory'] } 
            },
         });
         
         if (cogsAccount && inventoryAccount) {
            transactionsList.push({ accountId: cogsAccount.id, type: 'Debit', amount: totalCOGS });
            transactionsList.push({ accountId: inventoryAccount.id, type: 'Credit', amount: totalCOGS });
         }
      }

      await tx.journalEntry.create({
        data: {
          tenantId,
          date: invoice.issueDate,
          description: `Invoice #${invoice.invoiceNumber}`,
          reference: invoice.invoiceNumber,
          posted: true,
          transactions: {
            create: transactionsList.map((t) => ({
              tenantId,
              accountId: t.accountId,
              amount: new Decimal(t.amount).abs(),
              type: t.type as TransactionType,
              description: `Invoice #${invoice.invoiceNumber}`,
            })),
          },
        },
      });

      const balanceUpdates = [...transactionsList].sort((a, b) =>
        a.accountId.localeCompare(b.accountId),
      );

      for (const t of balanceUpdates) {
        const acct = await tx.account.findFirst({ where: { id: t.accountId, tenantId } });
        if (!acct) continue;

        const balanceChange = new Decimal(t.amount);
        const isNormalBalance =
          (acct.type === AccountType.Asset && t.type === 'Debit') ||
          (acct.type === AccountType.Expense && t.type === 'Debit') ||
          (acct.type === AccountType.Liability && t.type === 'Credit') ||
          (acct.type === AccountType.Equity && t.type === 'Credit') ||
          (acct.type === AccountType.Revenue && t.type === 'Credit');

        const finalChange = isNormalBalance ? balanceChange : balanceChange.negated();

        await tx.account.updateMany({
          where: { id: t.accountId, tenantId },
          data: { balance: { increment: finalChange } },
        });
      }

      const entryLag = Math.floor((Date.now() - new Date(invoice.issueDate).getTime()) / (1000 * 60));
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'INVOICE_CREATED',
          resource: `Invoice:${invoice.id}`,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            entryLagMinutes: entryLag,
          } as any,
        },
      });

      return invoice;
    };

    if (txOverride) return runInTransaction(txOverride);
    return this.prisma.$transaction(runInTransaction);
  }

  async updateInvoice(tenantId: string, id: string, data: any) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    // Audit Guard: Check lock for EXISTING record date
    await this.ledger.checkPeriodLock(tenantId, inv.issueDate);
    // Audit Guard: Check lock for NEW record date if changed
    if (data.issueDate) await this.ledger.checkPeriodLock(tenantId, data.issueDate);

    return this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteInvoice(tenantId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    await this.ledger.checkPeriodLock(tenantId, inv.issueDate);

    // Hard delete for now as per hardening requirements (cascade test)
    // In production, consider soft-delete if preferred.
    return this.prisma.invoice.deleteMany({
      where: { id, tenantId },
    });
  }

  async getInvoices(tenantId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId },
        include: { customer: true },
        orderBy: { issueDate: 'desc' },
        take: limit,
        skip: skip,
      }),
      this.prisma.invoice.count({ where: { tenantId } }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createInvoicesBulk(tenantId: string, invoices: any[]) {
    const results = [];
    const errors = [];
    for (const inv of invoices) {
      try {
        const res = await this.createInvoice(tenantId, inv);
        results.push({ invoiceNumber: inv.invoiceNumber, status: 'SUCCESS', id: res.id });
      } catch (err: any) {
        if (err.code === 'P2002') {
          results.push({ invoiceNumber: inv.invoiceNumber, status: 'SUCCESS', note: 'ALREADY_SYNCED' });
        } else {
          errors.push({ invoiceNumber: inv.invoiceNumber, status: 'FAILED', message: err.message });
        }
      }
    }
    return { total: invoices.length, successCount: results.length, errorCount: errors.length, results, errors };
  }
}
