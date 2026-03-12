import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InvoiceStatus,
  AccountType,
  TransactionType,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Industry } from '@nexus/shared';
import { LedgerService } from './ledger.service';
import { HsnService } from '../../inventory/services/hsn.service';
import { StandardAccounts, AccountSelectors } from '../constants/account-names';
import { normalizeState } from '../constants/states';
import { TraceService } from '../../common/services/trace.service';
import { InventoryService } from '../../inventory/inventory.service';

import { BillingService } from '../../system/services/billing.service';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private hsn: HsnService,
    private traceService: TraceService,
    private billing: BillingService,
    @Inject(forwardRef(() => InventoryService))
    private inventoryService: InventoryService,
  ) {}

  private validateGstin(gstin: string): boolean {
    if (!gstin) return true; // Unregistered
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstin.trim().toUpperCase());
  }

  async createInvoice(
    tenantId: string,
    data: any,
    txOverride?: any,
    deductStock: boolean = true,
  ) {
    const { items, customerId, dueDate, idempotencyKey } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException(
        'Compliance Error: Invoice must have at least one item.',
      );
    }

    // --- INDUSTRY INVARIANT: CONSTRUCTION PROJECT LINKAGE ---
    const client = txOverride || this.prisma;
    const tenant = await client.tenant.findUnique({
      where: { id: tenantId },
    });
    const industry = tenant?.industry || tenant?.type;

    if (industry === Industry.Construction && !data.projectId) {
      throw new BadRequestException(
        'Vertical Compliance Violation: Construction invoices must be linked to a specific Project for job-costing and revenue attribution.',
      );
    }

    const runInTransaction = async (tx: any) => {
      if (idempotencyKey) {
        const existing = await tx.invoice.findFirst({
          where: { idempotencyKey, tenantId },
          include: { items: true },
        });
        if (existing) return existing;
      }

      await this.ledger.checkPeriodLock(
        tenantId,
        data.issueDate || new Date(),
        tx,
      );

      // SECURITY (SUB-001): Atomic Quota Check with Row-Level Lock
      await this.billing.checkQuota(tenantId, 'maxInvoicesPerMonth', tx);

      const calculation = await this.calculateTotals(
        tenantId,
        customerId,
        items,
        tx,
      );
      let {
        totalTaxable,
        totalGST,
        totalCGST,
        totalSGST,
        totalIGST,
        grandTotal,
        totalCOGS,
        invoiceItemsData,
        isInterState,
      } = calculation;

      if (deductStock) {
        await this.handleInventoryDeduction(tenantId, invoiceItemsData, tx);
      }

      totalGST = this.ledger.round2(totalGST);
      totalCGST = this.ledger.round2(totalCGST);
      totalSGST = this.ledger.round2(totalSGST);
      totalIGST = this.ledger.round2(totalIGST);

      // ACC-007: Round-Off Ledger Implementation
      const unroundedGrandTotal = totalTaxable.add(totalGST);
      grandTotal = new Decimal(Math.round(unroundedGrandTotal.toNumber()));
      const roundingDifference = grandTotal.minus(unroundedGrandTotal);

      if (totalTaxable.isZero() && totalGST.greaterThan(0)) {
        throw new BadRequestException(
          'Compliance Violation: Tax-only invoices are not allowed. Please include a taxable base.',
        );
      }

      // GST-007: Composition Scheme Guard
      if (
        tenant?.businessType &&
        tenant.businessType.toLowerCase().includes('composition') &&
        totalGST.greaterThan(0)
      ) {
        throw new BadRequestException(
          'Compliance Error: Composition Scheme taxpayers are legally prohibited from collecting GST. Tax payload must be zero.',
        );
      }

      const invoiceNumber =
        data.invoiceNumber || (await this.generateInvoiceNumber(tenantId, tx));
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
          projectId: data.projectId || null,
          totalAmount: grandTotal,
          totalTaxable,
          totalGST,
          totalCGST,
          totalSGST,
          totalIGST,
          isInterState,
          amountPaid: amountPaidAtStart,
          idempotencyKey: data.idempotencyKey,
          correlationId: this.traceService.getCorrelationId(), // Forensic Trace
          status: amountPaidAtStart.greaterThanOrEqualTo(grandTotal)
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
            correlationId: this.traceService.getCorrelationId(), // Propagate Trace
          },
        });
      }

      const arAccount = await tx.account.findFirst({
        where: {
          tenantId,
          type: AccountType.Asset,
          name: StandardAccounts.ACCOUNTS_RECEIVABLE,
        },
      });
      const revenueAccount = await tx.account.findFirst({
        where: {
          tenantId,
          type: AccountType.Revenue,
          name: StandardAccounts.SALES,
        },
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
        throw new BadRequestException(
          'Ledger Configuration Error: Missing Accounts.',
        );

      const transactionsList = [
        {
          accountId: arAccount.id,
          type: 'Debit',
          amount: grandTotal,
          description: `Invoice #${invoice.invoiceNumber}`,
        },
        {
          accountId: revenueAccount.id,
          type: 'Credit',
          amount: totalTaxable,
          description: `Sales: Invoice #${invoice.invoiceNumber}`,
        },
      ];

      // Round-Off Entry (ACC-007)
      if (!roundingDifference.isZero()) {
        const roundingAccount = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.ROUNDING_OFF },
        });
        if (roundingAccount) {
          transactionsList.push({
            accountId: roundingAccount.id,
            type: roundingDifference.greaterThan(0) ? 'Credit' : 'Debit',
            amount: roundingDifference.abs(),
            description: `Round Off: Invoice #${invoice.invoiceNumber}`,
          });
        }
      }

      if (totalIGST.greaterThan(0) && igstAccount) {
        transactionsList.push({
          accountId: igstAccount.id,
          type: 'Credit',
          amount: totalIGST,
          description: `IGST: Invoice #${invoice.invoiceNumber}`,
        });
      } else {
        if (totalCGST.greaterThan(0) && cgstAccount) {
          transactionsList.push({
            accountId: cgstAccount.id,
            type: 'Credit',
            amount: totalCGST,
            description: `CGST: Invoice #${invoice.invoiceNumber}`,
          });
        }
        if (totalSGST.greaterThan(0) && sgstAccount) {
          transactionsList.push({
            accountId: sgstAccount.id,
            type: 'Credit',
            amount: totalSGST,
            description: `SGST: Invoice #${invoice.invoiceNumber}`,
          });
        }
      }

      // COGS Ledger Entry
      if (totalCOGS.greaterThan(0)) {
        const cogsAccount = await tx.account.findFirst({
          where: {
            tenantId,
            type: AccountType.Expense,
            name: StandardAccounts.COGS,
          },
        });
        const inventoryAccount = await tx.account.findFirst({
          where: {
            tenantId,
            name: { in: AccountSelectors.FINISHED_GOODS },
          },
        });

        if (cogsAccount && inventoryAccount) {
          transactionsList.push({
            accountId: cogsAccount.id,
            type: 'Debit',
            amount: totalCOGS,
            description: `COGS: #${invoice.invoiceNumber}`,
          });
          transactionsList.push({
            accountId: inventoryAccount.id,
            type: 'Credit',
            amount: totalCOGS,
            description: `Inventory: #${invoice.invoiceNumber}`,
          });
        }
      }

      // 1. Create Invoice Journal
      await this.ledger.createJournalEntry(
        tenantId,
        {
          date: invoice.issueDate,
          description: `Invoice #${invoice.invoiceNumber}`,
          reference: invoice.invoiceNumber,
          transactions: transactionsList.map((t) => ({
            accountId: t.accountId,
            type: t.type as any,
            amount: t.amount.toNumber(),
            description: t.description,
          })),
        },
        tx,
      );

      // 2. Create Payment Journal if upfront payment exists
      if (amountPaidAtStart.greaterThan(0)) {
        const bankAccount = await tx.account.findFirst({
          where: {
            tenantId,
            type: AccountType.Asset,
            name: StandardAccounts.BANK,
          },
        });
        if (bankAccount) {
          const paymentTransactions = [
            {
              accountId: bankAccount.id,
              type: 'Debit',
              amount: amountPaidAtStart,
              description: `Payment: In-#${invoice.invoiceNumber}`,
            },
            {
              accountId: arAccount.id,
              type: 'Credit',
              amount: amountPaidAtStart,
              description: `Payment: In-#${invoice.invoiceNumber}`,
            },
          ];

          await this.ledger.createJournalEntry(
            tenantId,
            {
              date: invoice.issueDate,
              description: `Payment for Invoice #${invoice.invoiceNumber}`,
              reference: `PAY-${invoice.invoiceNumber}`,
              transactions: paymentTransactions.map((t) => ({
                accountId: t.accountId,
                type: t.type as any,
                amount: t.amount.toNumber(),
                description: t.description,
              })),
            },
            tx,
          );
        }
      }

      const entryLag = Math.floor(
        (Date.now() - new Date(invoice.issueDate).getTime()) / (1000 * 60),
      );
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'INVOICE_CREATED',
          resource: `Invoice:${invoice.id}`,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            entryLagMinutes: entryLag,
            gstOverridesUsed: invoiceItemsData.some((i) => i.isGstOverride),
          } as any,
        },
      });

      return invoice;
    };

    if (txOverride) return runInTransaction(txOverride);
    return this.prisma.$transaction(runInTransaction, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async updateInvoice(tenantId: string, id: string, data: any) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    // Rule: Cannot edit Paid or Cancelled invoices
    if (
      inv.status === InvoiceStatus.Paid ||
      inv.status === InvoiceStatus.Cancelled
    ) {
      throw new BadRequestException(
        `Audit Violation: Cannot edit an invoice with status '${inv.status}'`,
      );
    }

    // Whitelist approach: Only minor metadata can be updated
    const allowed = ['notes', 'summary', 'dueDate', 'billingTimeSeconds'];
    const forbidden = Object.keys(data).filter((k) => !allowed.includes(k));

    if (forbidden.length > 0) {
      throw new BadRequestException(
        `Forensic Guard: Editing financial fields (${forbidden.join(', ')}) is forbidden. Use reversals for corrections.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // BUG-FIN-013 FIX: Secure Period Lock Validation natively within transaction
      await this.ledger.checkPeriodLock(tenantId, inv.issueDate, tx);

      return tx.invoice.update({
        where: { id },
        data,
      });
    });
  }

  async cancelInvoice(tenantId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });

      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status === 'Cancelled')
        throw new BadRequestException('Invoice is already cancelled');

      await this.ledger.checkPeriodLock(tenantId, inv.issueDate, tx);

      // 1. Reverse Stock
      for (const item of inv.items) {
        // ACC-002: Look up the original OUT movement to find the exact warehouse used.
        const originalMovement = await tx.stockMovement.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            reference: inv.invoiceNumber,
            type: 'OUT',
          },
        });

        // ACC-002: If original movement not found (legacy invoice created before stock
        // tracking), fall back to the tenant's first warehouse. If no warehouse exists,
        // throw an explicit error — an empty warehouseId would silently corrupt stock.
        const fallbackWarehouse = !originalMovement?.warehouseId
          ? await tx.warehouse.findFirst({
              where: { tenantId },
              orderBy: { id: 'asc' },
            })
          : null;

        const warehouseId =
          originalMovement?.warehouseId || fallbackWarehouse?.id;

        if (!warehouseId) {
          throw new BadRequestException(
            `Stock reversal failed for Product ${item.productId}: no warehouse found. ` +
              `Create at least one warehouse before cancelling stock-tracked invoices.`,
          );
        }

        const isLegacyFallback =
          !originalMovement?.warehouseId && !!fallbackWarehouse;

        await tx.product.updateMany({
          where: { id: item.productId, tenantId },
          data: { stock: { increment: item.quantity } },
        });

        // Manual Reconciliation (safest approach for composite keys in concurrent env)
        const location = await (tx.stockLocation as any).findFirst({
          where: {
            tenantId,
            productId: item.productId,
            warehouseId,
            notes: '',
          },
        });

        if (location) {
          await (tx.stockLocation as any).update({
            where: { id: location.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await (tx.stockLocation as any).create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId,
              quantity: item.quantity,
              notes: '',
            },
          });
        }

        await (tx as any).stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
            type: 'IN',
            reference: `CNL-${inv.invoiceNumber}`,
            notes: isLegacyFallback
              ? `Invoice Cancellation Reversal (warehouse fallback — original movement not tracked)`
              : `Invoice Cancellation Reversal`,
            correlationId: (this.traceService as any).getCorrelationId(),
          },
        });
      }

      // 1.5 Fetch Payments associated with this invoice
      const payments = await tx.payment.findMany({
        where: { invoiceId: id, tenantId },
      });
      const paymentRefs = payments.map((p) => p.reference).filter(Boolean);

      // 2. Reverse Journals
      const journals = await tx.journalEntry.findMany({
        where: {
          tenantId,
          OR: [
            { reference: inv.invoiceNumber },
            { reference: { in: paymentRefs as string[] } },
            { reference: `Initial-POS-${inv.invoiceNumber}` },
            { reference: `PAY-${inv.invoiceNumber}` },
          ],
        },
        include: { transactions: true },
      });

      // Safety: exclude journals that are already reversals or cancelled
      const filteredJournals = journals.filter(
        (j) => !j.reference?.startsWith('CAN-'),
      );

      for (const journal of filteredJournals) {
        await this.ledger.createJournalEntry(
          tenantId,
          {
            date: new Date().toISOString(),
            description: `Cancellation of Voucher #${journal.reference}`,
            reference: `CAN-${journal.reference}`,
            transactions: journal.transactions.map((t) => ({
              accountId: t.accountId,
              type: (t.type === 'Debit' ? 'Credit' : 'Debit') as any, // Flip Dr/Cr
              amount: new Decimal(t.amount).toNumber(),
              description: `Reversal: ${t.description}`,
            })),
          },
          tx,
        );
      }

      // 3. Update Invoice Status
      return (tx.invoice as any).update({
        where: { id },
        data: { status: 'Cancelled', cancellationReason: reason },
      });
    });
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        project: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found.`);
    }

    return invoice;
  }

  async deleteInvoice(tenantId: string, id: string) {
    throw new BadRequestException(
      'Data Integrity Violation: Hard deletion of invoices is forbidden to maintain audit trails. Please use the Cancel Invoice function instead.',
    );
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

  /**
   * Bulk invoice creation.
   * INV-BULK-001: Supports both 'best-effort' (partial success) and 'atomic' (all-or-nothing) modes.
   */
  async createInvoicesBulk(
    tenantId: string,
    invoices: any[],
    options: { atomic?: boolean } = {},
  ) {
    if (options.atomic) {
      return this.prisma.$transaction(async (tx) => {
        const results = [];
        for (const inv of invoices) {
          const res = await this.createInvoice(tenantId, inv, tx);
          results.push({
            invoiceNumber: inv.invoiceNumber,
            status: 'SUCCESS',
            id: res.id,
          });
        }
        return {
          total: invoices.length,
          successCount: results.length,
          errorCount: 0,
          results,
          errors: [],
        };
      });
    }

    const results = [];
    const errors = [];
    for (const inv of invoices) {
      try {
        const res = await this.createInvoice(tenantId, inv);
        results.push({
          invoiceNumber: inv.invoiceNumber,
          status: 'SUCCESS',
          id: res.id,
        });
      } catch (err: any) {
        // Idempotency: skip if already synced (DUPLICATE_INVOICE_NUMBER)
        if (err.code === 'P2002' || err.message?.includes('ALREADY_SYNCED')) {
          results.push({
            invoiceNumber: inv.invoiceNumber,
            status: 'SUCCESS',
            note: 'ALREADY_SYNCED',
          });
        } else {
          errors.push({
            invoiceNumber: inv.invoiceNumber,
            status: 'FAILED',
            message: err.message,
          });
        }
      }
    }
    return {
      total: invoices.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors,
    };
  }

  async generateInvoiceNumber(tenantId: string, tx: any): Promise<string> {
    // ACC-001: Concurrency-safe invoice numbering via PostgreSQL advisory lock.
    //
    // The old COUNT-based approach had a race: two concurrent transactions both
    // read the same count and generated the same invoice number.
    //
    // Strategy: Acquire a transaction-scoped advisory lock (pg_try_advisory_xact_lock)
    // keyed on a deterministic integer derived from the tenantId. This serializes
    // invoice creation per tenant without requiring a migration or a counter table.
    // The lock is automatically released when the surrounding transaction ends.
    //
    // The lock key is a signed 64-bit integer. We derive it from the first 8 bytes
    // of the SHA-256 of the tenantId string for a stable, collision-resistant mapping.
    const crypto = require('crypto');
    const hashBuf = crypto.createHash('sha256').update(tenantId).digest();
    // Read as signed 32-bit int to stay within PostgreSQL's bigint advisory lock range
    const lockKey = hashBuf.readInt32BE(0);

    // Acquire the lock. pg_try_advisory_xact_lock returns false if the lock is
    // already held by another transaction — retry by waiting (use pg_advisory_xact_lock
    // which blocks until the lock is available, safe inside a transaction).
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);

    // Under the lock: count is stable, no concurrent transaction can also hold this lock
    const year = new Date().getFullYear();
    const count = await tx.invoice.count({ where: { tenantId } });
    const candidate = `INV/${year}/${(count + 1).toString().padStart(4, '0')}`;

    // Uniqueness double-check: handles the edge case of invoices created in a prior year
    // that break the padded sequence (e.g., count=9999 produces INV/2026/10000)
    const collision = await tx.invoice.findFirst({
      where: { tenantId, invoiceNumber: candidate },
    });
    if (collision) {
      // Fall back to a timestamp-based suffix to ensure uniqueness
      return `INV/${year}/${Date.now().toString(36).toUpperCase()}`;
    }

    return candidate;
  }

  async calculateTotals(
    tenantId: string,
    customerId: string,
    items: any[],
    tx: any,
  ) {
    let totalTaxable = new Decimal(0);
    let totalGST = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);
    let totalCOGS = new Decimal(0);
    const invoiceItemsData = [];

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId, isDeleted: false },
    });

    if (!tenant?.state) {
      throw new BadRequestException(
        'Compliance Error: Tenant state is missing. Please update company profile before invoicing.',
      );
    }
    if (!customer?.state) {
      throw new BadRequestException(
        'Compliance Error: Customer state is missing. GST calculation requires place of supply.',
      );
    }

    const tenantState = normalizeState(tenant.state || undefined); // Changed '' to undefined
    const customerState = normalizeState(customer.state || undefined); // Changed '' to undefined
    const isInterState =
      tenantState.toLowerCase() !== customerState.toLowerCase();

    if (customer.gstin && !this.validateGstin(customer.gstin)) {
      throw new BadRequestException(
        `Compliance Error: Invalid GSTIN format for customer ${customer.company || customer.firstName}. Statutory reporting requires valid GSTIN.`,
      );
    }

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
        throw new BadRequestException(
          `Compliance Error: HSN Code is missing for product ${product.name}. Required for GST invoices.`,
        );
      }

      const qty = new Decimal(item.quantity);
      const unitPrice = this.ledger.round2(item.price);
      const gstRate = new Decimal(product.gstRate || 0);

      // Verify GST rate against HSN Master
      const { isValid, officialRate } = await this.hsn.validateGstRate(
        tenantId,
        product.hsnCode,
        gstRate,
        tx,
      );

      if (!isValid && !item.isGstOverride) {
        throw new BadRequestException(
          `Compliance Error: GST Rate mismatch for product ${product.name} (HSN: ${product.hsnCode}). ` +
            `Official Rate: ${officialRate}%, Invoice Rate: ${gstRate}%. ` +
            `Set 'isGstOverride' to true to allow this manual override.`,
        );
      }

      const taxable = this.ledger.round2(qty.mul(unitPrice));
      const taxAmount = this.ledger.round2(taxable.mul(gstRate).div(100));

      totalTaxable = totalTaxable.add(taxable);
      totalGST = totalGST.add(taxAmount);
      totalCOGS = totalCOGS.add(new Decimal(product.costPrice || 0).mul(qty));

      let itemCgstAmount = new Decimal(0);
      let itemSgstAmount = new Decimal(0);
      let itemIgstAmount = new Decimal(0);

      if (isInterState) {
        totalIGST = totalIGST.add(taxAmount);
        itemIgstAmount = taxAmount;
      } else {
        const cgstFloor = taxAmount
          .div(2)
          .toDecimalPlaces(2, Decimal.ROUND_DOWN);
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
        isGstOverride: item.isGstOverride || false,
        taxableAmount: taxable,
        gstAmount: taxAmount,
        cgstAmount: itemCgstAmount,
        sgstAmount: itemSgstAmount,
        igstAmount: itemIgstAmount,
        totalAmount: this.ledger.round2(taxable.add(taxAmount)),
      });
    }

    return {
      totalTaxable,
      totalGST,
      totalCGST,
      totalSGST,
      totalIGST,
      grandTotal: totalTaxable.add(totalGST),
      totalCOGS,
      invoiceItemsData,
      isInterState,
    };
  }

  async handleInventoryDeduction(
    tenantId: string,
    invoiceItems: any[],
    tx: any,
  ) {
    for (const item of invoiceItems) {
      const qty = new Decimal(item.quantity);

      const warehouse = await tx.warehouse.findFirst({
        where: { tenantId },
        orderBy: { id: 'asc' },
      });

      if (warehouse) {
        // centralized, atomic deduction that handles both product.stock and stockLocation.quantity
        // and includes the safety guard to prevent negative stock.
        await this.inventoryService.deductStock(
          tx,
          item.productId,
          warehouse.id,
          qty,
          '',
          {
            tenantId,
            reference: 'SALE',
            correlationId: this.traceService.getCorrelationId(),
          },
        );
      } else {
        // Fallback for tenants without warehouses (though unlikely given onboarding)
        // We still need to decrement global stock at a minimum.
        const result = await tx.product.updateMany({
          where: { id: item.productId, tenantId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (result.count === 0) {
          throw new BadRequestException(
            `Insufficient stock for ${item.productName}. Requested: ${qty}`,
          );
        }
      }
    }
  }
}
