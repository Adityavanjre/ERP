import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, AccountType, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';
import { StandardAccounts, AccountSelectors } from '../constants/account-names';
import { normalizeState } from '../constants/states';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) { }

  async createInvoice(
    tenantId: string,
    data: any,
    txOverride?: any,
    deductStock: boolean = true,
  ) {
    const { items, customerId, dueDate, idempotencyKey } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('Compliance Error: Invoice must have at least one item.');
    }

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

      if (!tenant?.state) {
        throw new BadRequestException('Compliance Error: Tenant state is missing. Please update company profile before invoicing.');
      }
      if (!customer?.state) {
        throw new BadRequestException('Compliance Error: Customer state is missing. GST calculation requires place of supply.');
      }

      const tenantState = normalizeState(tenant.state || '');
      const customerState = normalizeState(customer.state || '');

      const isInterState =
        tenantState.toLowerCase() !== customerState.toLowerCase();

      const sortedItems = [...items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );

      for (const item of sortedItems) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId, isDeleted: false },
        });
        if (!product)
          throw new NotFoundException(`Product ${item.productId} not found`);

        if (!product.hsnCode) {
          throw new BadRequestException(`Compliance Error: HSN Code is missing for product ${product.name}. Required for GST invoices.`);
        }

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
                { name: 'Main Warehouse' },
                {} // Fallback
              ]
            }
          });

          if (warehouse) {
            // 2. Decrement Stock Location
            const existingLoc = await tx.stockLocation.findUnique({
              where: {
                tenantId_productId_warehouseId_notes: {
                  tenantId,
                  productId: item.productId,
                  warehouseId: warehouse.id,
                  notes: ''
                },
              },
            });

            if (existingLoc) {
              await tx.stockLocation.update({
                where: { id: existingLoc.id },
                data: { quantity: { decrement: qty } }
              });
            } else {
              // Create negative entry if allowed by global settings
              await tx.stockLocation.create({
                data: {
                  tenantId,
                  productId: item.productId,
                  warehouseId: warehouse.id,
                  quantity: qty.negated(),
                  notes: ''
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
          // Fix Industrial Rounding Drift: Compute CGST floor and SGST rest
          const cgstFloor = taxAmount.div(2).toDecimalPlaces(2, Decimal.ROUND_DOWN);
          const sgstRest = taxAmount.sub(cgstFloor);

          itemCgstAmount = cgstFloor;
          itemSgstAmount = sgstRest;

          totalCGST = totalCGST.add(itemCgstAmount);
          totalSGST = totalSGST.add(itemSgstAmount);
        }

        invoiceItemsData.push({
          tenantId,
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

      if (totalTaxable.isZero() && totalGST.greaterThan(0)) {
        throw new BadRequestException('Compliance Violation: Tax-only invoices are not allowed. Please include a taxable base.');
      }

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
        where: { tenantId, type: AccountType.Asset, name: StandardAccounts.ACCOUNTS_RECEIVABLE },
      });
      const revenueAccount = await tx.account.findFirst({
        where: { tenantId, type: AccountType.Revenue, name: StandardAccounts.SALES },
      });

      // Split tax ledgers
      const cgstAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.OUTPUT_CGST },
      });
      const sgstAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.OUTPUT_SGST },
      });
      const igstAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.OUTPUT_IGST },
      });

      if (!arAccount || !revenueAccount)
        throw new BadRequestException('Ledger Configuration Error: Missing Accounts.');

      const transactionsList = [
        { accountId: arAccount.id, type: 'Debit', amount: grandTotal, description: `Invoice #${invoice.invoiceNumber}` },
        { accountId: revenueAccount.id, type: 'Credit', amount: totalTaxable, description: `Sales: Invoice #${invoice.invoiceNumber}` },
      ];

      if (totalIGST.greaterThan(0) && igstAccount) {
        transactionsList.push({ accountId: igstAccount.id, type: 'Credit', amount: totalIGST, description: `IGST: Invoice #${invoice.invoiceNumber}` });
      } else {
        if (totalCGST.greaterThan(0) && cgstAccount) {
          transactionsList.push({ accountId: cgstAccount.id, type: 'Credit', amount: totalCGST, description: `CGST: Invoice #${invoice.invoiceNumber}` });
        }
        if (totalSGST.greaterThan(0) && sgstAccount) {
          transactionsList.push({ accountId: sgstAccount.id, type: 'Credit', amount: totalSGST, description: `SGST: Invoice #${invoice.invoiceNumber}` });
        }
      }

      // COGS Ledger Entry
      if (totalCOGS.greaterThan(0)) {
        const cogsAccount = await tx.account.findFirst({
          where: { tenantId, type: AccountType.Expense, name: StandardAccounts.COGS },
        });
        const inventoryAccount = await tx.account.findFirst({
          where: {
            tenantId,
            name: { in: AccountSelectors.FINISHED_GOODS }
          },
        });

        if (cogsAccount && inventoryAccount) {
          transactionsList.push({ accountId: cogsAccount.id, type: 'Debit', amount: totalCOGS, description: `COGS: #${invoice.invoiceNumber}` });
          transactionsList.push({ accountId: inventoryAccount.id, type: 'Credit', amount: totalCOGS, description: `Inventory: #${invoice.invoiceNumber}` });
        }
      }

      // 1. Create Invoice Journal
      await this.ledger.createJournalEntry(tenantId, {
        date: invoice.issueDate,
        description: `Invoice #${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        transactions: transactionsList.map(t => ({
          accountId: t.accountId,
          type: t.type as any,
          amount: t.amount.toNumber(),
          description: t.description
        }))
      }, tx);

      // 2. Create Payment Journal if upfront payment exists
      if (amountPaidAtStart.greaterThan(0)) {
        const bankAccount = await tx.account.findFirst({
          where: { tenantId, type: AccountType.Asset, name: StandardAccounts.BANK },
        });
        if (bankAccount) {
          const paymentTransactions = [
            { accountId: bankAccount.id, type: 'Debit', amount: amountPaidAtStart, description: `Payment: In-#${invoice.invoiceNumber}` },
            { accountId: arAccount.id, type: 'Credit', amount: amountPaidAtStart, description: `Payment: In-#${invoice.invoiceNumber}` },
          ];

          await this.ledger.createJournalEntry(tenantId, {
            date: invoice.issueDate,
            description: `Payment for Invoice #${invoice.invoiceNumber}`,
            reference: `PAY-${invoice.invoiceNumber}`,
            transactions: paymentTransactions.map(t => ({
              accountId: t.accountId,
              type: t.type as any,
              amount: t.amount.toNumber(),
              description: t.description
            }))
          }, tx);
        }
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

    // Block financial/audit-critical changes in update
    const internalFields = ['totalAmount', 'totalTaxable', 'totalGST', 'customerId', 'invoiceNumber'];
    const hasForbiddenChanges = internalFields.some(f => data[f] !== undefined && data[f] !== (inv as any)[f]);

    if (hasForbiddenChanges) {
      throw new BadRequestException('Audit Violation: Amount, Customer, or Invoice Number cannot be modified once saved. Please Cancel the invoice and create a new one for corrections.');
    }

    return this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async cancelInvoice(tenantId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });

      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status === 'Cancelled') throw new BadRequestException('Invoice is already cancelled');

      await this.ledger.checkPeriodLock(tenantId, inv.issueDate, tx);

      // 1. Reverse Stock
      // 1. Reverse Stock
      for (const item of inv.items) {
        const originalMovement = await tx.stockMovement.findFirst({
          where: { tenantId, productId: item.productId, reference: inv.invoiceNumber, type: 'OUT' }
        });

        const warehouseId = originalMovement?.warehouseId ||
          (await tx.warehouse.findFirst({ where: { tenantId } }))?.id || '';

        await tx.product.updateMany({
          where: { id: item.productId, tenantId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockLocation.upsert({
          where: {
            tenantId_productId_warehouseId_notes: {
              tenantId,
              productId: item.productId,
              warehouseId: warehouseId,
              notes: ''
            }
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            tenantId,
            productId: item.productId,
            warehouseId: warehouseId,
            quantity: item.quantity,
            notes: ''
          }
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: warehouseId,
            quantity: item.quantity,
            type: 'IN',
            reference: inv.invoiceNumber,
            notes: `Invoice Cancellation Reversal`
          }
        });
      }

      // 1.5 Fetch Payments associated with this invoice
      const payments = await tx.payment.findMany({
        where: { invoiceId: id, tenantId },
      });
      const paymentRefs = payments.map(p => p.reference).filter(Boolean);

      // 2. Reverse Journals
      const journals = await tx.journalEntry.findMany({
        where: {
          tenantId,
          OR: [
            { reference: inv.invoiceNumber },
            { reference: { in: paymentRefs as string[] } },
            { reference: `Initial-POS-${inv.invoiceNumber}` },
            { reference: `PAY-${inv.invoiceNumber}` },
          ]
        },
        include: { transactions: true },
      });

      // Safety: exclude journals that are already reversals or cancelled
      const filteredJournals = journals.filter(j => !j.reference?.startsWith('CAN-'));

      for (const journal of filteredJournals) {
        await this.ledger.createJournalEntry(tenantId, {
          date: new Date().toISOString(),
          description: `Cancellation of Voucher #${journal.reference}`,
          reference: `CAN-${journal.reference}`,
          transactions: journal.transactions.map(t => ({
            accountId: t.accountId,
            type: (t.type === 'Debit' ? 'Credit' : 'Debit') as any, // Flip Dr/Cr
            amount: new Decimal(t.amount).toNumber(),
            description: `Reversal: ${t.description}`
          }))
        }, tx);
      }

      // 3. Update Invoice Status
      return (tx.invoice as any).update({
        where: { id },
        data: { status: 'Cancelled', cancellationReason: reason }
      });
    });
  }

  async deleteInvoice(tenantId: string, id: string) {
    throw new BadRequestException('Data Integrity Violation: Hard deletion of invoices is forbidden to maintain audit trails. Please use the Cancel Invoice function instead.');
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
