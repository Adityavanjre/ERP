import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PaymentMode,
  AccountType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';
import { StandardAccounts } from '../constants/account-names';
import { TdsService } from './tds.service';
import { TraceService } from '../../common/services/trace.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private tds: TdsService,
    private readonly traceService: TraceService,
  ) {}

  async createPayment(tenantId: string, data: CreatePaymentDto) {
    if (!data.customerId && !data.supplierId) {
      throw new BadRequestException(
        'Recipient identity required (Customer or Supplier).',
      );
    }

    if (new Decimal(data.amount).lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ledger.checkPeriodLock(tenantId, data.date || new Date(), tx);

      if (data.idempotencyKey) {
        const existing = await tx.payment.findFirst({
          where: {
            tenantId,
            idempotencyKey: data.idempotencyKey,
          },
        });
        if (existing) return existing;
      }

      const bankAccount = await tx.account.findFirst({
        where: {
          tenantId,
          type: AccountType.Asset,
          name: { contains: 'Bank' },
        },
      });
      const arAccount = await tx.account.findFirst({
        where: {
          tenantId,
          type: AccountType.Asset,
          name: 'Accounts Receivable',
        },
      });
      const apAccount = await tx.account.findFirst({
        where: {
          tenantId,
          type: AccountType.Liability,
          name: 'Accounts Payable',
        },
      });

      if (!bankAccount)
        throw new BadRequestException("Missing 'Bank' account.");

      let payment;
      if (data.customerId) {
        if (!arAccount)
          throw new BadRequestException(
            "Missing 'Accounts Receivable' account.",
          );

        let invoice: any = null;
        let appliedToInvoice = new Decimal(0);
        let excessToAdvance = new Decimal(0);
        let roundOffDebit = new Decimal(0);
        let roundOffCredit = new Decimal(0);

        if (data.invoiceId) {
          invoice = await tx.invoice.findFirst({
            where: { id: data.invoiceId, tenantId },
          });
          if (!invoice) throw new NotFoundException('Invoice not found');
          if (invoice.isLocked)
            throw new BadRequestException('This invoice is locked.');

          const outstanding = this.ledger.round2(
            new Decimal(invoice.totalAmount).sub(
              new Decimal(invoice.amountPaid),
            ),
          );
          appliedToInvoice = Decimal.min(new Decimal(data.amount), outstanding);
          excessToAdvance = new Decimal(data.amount).sub(appliedToInvoice);

          // ACC-007: Automatic Round-Off logic for +/- 1.00 discrepancy
          const diff = new Decimal(data.amount).sub(outstanding);
          if (!diff.isZero() && diff.abs().lessThanOrEqualTo(1)) {
            if (diff.isNegative()) {
              roundOffDebit = diff.abs();
              appliedToInvoice = outstanding;
              excessToAdvance = new Decimal(0);
            } else {
              roundOffCredit = diff.abs();
              appliedToInvoice = outstanding;
              excessToAdvance = new Decimal(0);
            }
          }

          const newAmountPaid = this.ledger.round2(
            new Decimal(invoice.amountPaid).add(appliedToInvoice),
          );
          const totalAmt = new Decimal(invoice.totalAmount);
          const isFullyPaid = newAmountPaid.greaterThanOrEqualTo(
            totalAmt.sub(new Decimal('0.01')),
          );

          // SECURITY (ACC-003): Optimistic Concurrency Control (OCC)
          const updateResult = await tx.invoice.updateMany({
            where: { id: invoice.id, tenantId, amountPaid: invoice.amountPaid },
            data: {
              amountPaid: newAmountPaid,
              status: isFullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Partial,
            },
          });

          if (updateResult.count === 0) {
            throw new BadRequestException(
              'Concurrent payment processing detected. Payment aborted.',
            );
          }
        } else {
          // If no invoiceId, treat entire amount as Advance
          excessToAdvance = new Decimal(data.amount);
          appliedToInvoice = new Decimal(0);
        }

        payment = await tx.payment.create({
          data: {
            tenantId,
            customerId: data.customerId,
            invoiceId: data.invoiceId,
            amount: data.amount,
            date: new Date(data.date || new Date()),
            mode: data.mode,
            reference: data.reference,
            notes: data.notes,
            idempotencyKey: data.idempotencyKey,
            correlationId: (data.correlationId ||
              this.traceService.getCorrelationId()) as any,
          } as any,
        });

        const customerAdvanceAccount = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.CUSTOMER_ADVANCE },
        });

        const transactions: any[] = [
          {
            accountId: bankAccount.id,
            type: 'Debit',
            amount: new Decimal(data.amount).toNumber(),
            description: 'Customer Payment',
          },
        ];

        if (roundOffDebit.gt(0)) {
          const roundOffAccount = await tx.account.findFirst({
            where: { tenantId, name: StandardAccounts.ROUNDING_OFF },
          });
          if (!roundOffAccount)
            throw new BadRequestException(
              `Missing '${StandardAccounts.ROUNDING_OFF}' account.`,
            );
          transactions.push({
            accountId: roundOffAccount.id,
            type: 'Debit',
            amount: roundOffDebit.toNumber(),
            description: 'Round Off',
          });
        }

        if (appliedToInvoice.gt(0)) {
          transactions.push({
            accountId: arAccount.id,
            type: 'Credit',
            amount: appliedToInvoice.toNumber(),
            description: `Invoice Payment: ${invoice?.invoiceNumber || ''}`,
          });
        }

        if (roundOffCredit.gt(0)) {
          const roundOffAccount = await tx.account.findFirst({
            where: { tenantId, name: StandardAccounts.ROUNDING_OFF },
          });
          if (!roundOffAccount)
            throw new BadRequestException(
              `Missing '${StandardAccounts.ROUNDING_OFF}' account.`,
            );
          transactions.push({
            accountId: roundOffAccount.id,
            type: 'Credit',
            amount: roundOffCredit.toNumber(),
            description: 'Round Off',
          });
        }

        if (excessToAdvance.gt(0)) {
          if (!customerAdvanceAccount)
            throw new BadRequestException(
              `Missing '${StandardAccounts.CUSTOMER_ADVANCE}' account.`,
            );
          transactions.push({
            accountId: customerAdvanceAccount.id,
            type: 'Credit',
            amount: excessToAdvance.toNumber(),
            description: 'Advance Payment',
          });
        }

        await this.ledger.createJournalEntry(
          tenantId,
          {
            date: payment.date.toISOString(),
            description: `Payment Recv: ${payment.reference || 'REF-' + payment.id.slice(0, 8)}`,
            reference: payment.reference || `PAY-${payment.id.slice(0, 8)}`,
            transactions,
            correlationId: (payment as any).correlationId || undefined,
          },
          tx,
        );

        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'PAYMENT_RECEIVED',
            resource: `Payment:${payment.id}`,
            details: {
              amount: data.amount,
              mode: data.mode,
              invoiceId: data.invoiceId,
              reference: data.reference,
            } as any,
          },
        });
      } else {
        if (!apAccount)
          throw new BadRequestException("Missing 'Accounts Payable' account.");

        // TDS Logic
        let tdsAmount = new Decimal(0);
        let netAmount = new Decimal(data.amount);
        let ruleId: string | undefined;

        const supplier = await tx.supplier.findFirst({
          where: { id: data.supplierId!, tenantId },
        });
        const activeTdsSection =
          data.tdsSection || (supplier as any)?.defaultTdsSection;

        if (activeTdsSection) {
          const res = await this.tds.calculateTds(
            tenantId,
            data.supplierId!,
            activeTdsSection,
            data.amount,
          );
          tdsAmount = res.tdsAmount;
          netAmount = res.netAmount;
          ruleId = res.ruleId;
        }

        payment = await tx.payment.create({
          data: {
            tenantId,
            supplierId: data.supplierId,
            amount: data.amount,
            tdsAmount: tdsAmount as any,
            netAmount: netAmount as any,
            date: new Date(data.date || new Date()),
            mode: data.mode,
            reference: data.reference,
            notes: data.notes,
            idempotencyKey: data.idempotencyKey,
            correlationId: (data.correlationId ||
              this.traceService.getCorrelationId()) as any,
          } as any,
        });

        if (ruleId && tdsAmount.greaterThan(0)) {
          await this.tds.recordTdsTransaction(
            tenantId,
            {
              ruleId,
              supplierId: data.supplierId!,
              amount: new Decimal(data.amount),
              tdsAmount,
              paymentId: payment.id,
              date: payment.date,
            },
            tx,
          );
        }

        const tdsPayableAccount = await tx.account.findFirst({
          where: { tenantId, name: StandardAccounts.TDS_PAYABLE },
        });

        const ledgerTransactions = [
          {
            accountId: apAccount.id,
            type: 'Debit',
            amount: new Decimal(data.amount).toNumber(),
            description: 'Supplier Payment',
          },
          {
            accountId: bankAccount.id,
            type: 'Credit',
            amount: netAmount.toNumber(),
            description: 'Supplier Payment',
          },
        ];

        if (tdsAmount.greaterThan(0)) {
          if (!tdsPayableAccount)
            throw new BadRequestException(
              `Missing '${StandardAccounts.TDS_PAYABLE}' account.`,
            );
          ledgerTransactions.push({
            accountId: tdsPayableAccount.id,
            type: 'Credit' as any,
            amount: tdsAmount.toNumber(),
            description: `TDS Deducted (${data.tdsSection})`,
          });
        }

        await this.ledger.createJournalEntry(
          tenantId,
          {
            date: payment.date.toISOString(),
            description: `Vendor Payment: ${payment.reference || 'REF-' + payment.id.slice(0, 8)}`,
            reference:
              payment.reference || `VEND-PAY-${payment.id.slice(0, 8)}`,
            correlationId: (payment as any).correlationId || undefined,
            transactions: ledgerTransactions as any,
          },
          tx,
        );
      }

      return payment;
    });
  }

  async cancelPayment(tenantId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const pay = await tx.payment.findFirst({
        where: { id, tenantId },
        include: { invoice: true },
      });
      if (!pay) throw new NotFoundException('Payment not found');
      if (pay.notes?.includes('CANCELLED'))
        throw new BadRequestException('Payment is already cancelled');

      // BUG-AUTH-02 FIX: Check both the original payment date AND today (the reversal date).
      // Without this, a cancellation reversal can be posted into a currently-open period
      // that was accidentally left unlocked, while the original period is correctly locked.
      await this.ledger.checkPeriodLock(tenantId, pay.date, tx);
      await this.ledger.checkPeriodLock(tenantId, new Date(), tx);

      // 1. Find the Journal Entry associated with this payment
      const journal = await tx.journalEntry.findFirst({
        where: {
          tenantId,
          reference: pay.reference || undefined,
          description: { contains: pay.id.slice(0, 8) },
        },
        include: { transactions: true },
      });

      // 2. Reverse the Journal Entry
      if (journal) {
        await this.ledger.createJournalEntry(
          tenantId,
          {
            date: new Date().toISOString(),
            description: `Reversal: ${journal.description} (Reason: ${reason})`,
            reference: `CAN-${journal.reference || pay.id.slice(0, 8)}`,
            transactions: journal.transactions.map((t) => ({
              accountId: t.accountId,
              type: (t.type === 'Debit' ? 'Credit' : 'Debit') as any,
              amount: new Decimal(t.amount).toNumber(),
              description: `Reversal of ${t.description}`,
            })),
            correlationId: this.traceService.getCorrelationId(),
          },
          tx,
        );
      } else {
        // ACC-INTEGRITY-01: If no original journal is found (e.g. legacy payment created before
        // journal tracking was added), we MUST still use createJournalEntry to reverse balances.
        // Direct balance mutations via updateMany bypass double-entry enforcement and leave no
        // audit trail — they are forbidden in any code path, including fallbacks.
        // We reconstruct the correcting journal from the payment data itself.
        const bankAccount = await tx.account.findFirst({
          where: {
            tenantId,
            type: AccountType.Asset,
            name: { contains: 'Bank' },
          },
        });
        if (pay.customerId) {
          const arAccount = await tx.account.findFirst({
            where: {
              tenantId,
              type: AccountType.Asset,
              name: 'Accounts Receivable',
            },
          });
          if (bankAccount && arAccount) {
            await this.ledger.createJournalEntry(
              tenantId,
              {
                date: new Date().toISOString(),
                description: `Reversal: Payment ${pay.id.slice(0, 8)} (no original journal — legacy path) Reason: ${reason}`,
                reference: `CAN-LEGACY-${pay.id.slice(0, 8)}`,
                transactions: [
                  {
                    accountId: arAccount.id,
                    type: 'Debit',
                    amount: new Decimal(pay.amount).toNumber(),
                    description: 'Payment Reversal',
                  },
                  {
                    accountId: bankAccount.id,
                    type: 'Credit',
                    amount: new Decimal(pay.amount).toNumber(),
                    description: 'Payment Reversal',
                  },
                ],
              },
              tx,
            );
          }
        } else if (pay.supplierId) {
          const apAccount = await tx.account.findFirst({
            where: {
              tenantId,
              type: AccountType.Liability,
              name: 'Accounts Payable',
            },
          });
          if (apAccount && bankAccount) {
            await this.ledger.createJournalEntry(
              tenantId,
              {
                date: new Date().toISOString(),
                description: `Reversal: Vendor Payment ${pay.id.slice(0, 8)} (no original journal — legacy path) Reason: ${reason}`,
                reference: `CAN-LEGACY-VEND-${pay.id.slice(0, 8)}`,
                transactions: [
                  {
                    accountId: bankAccount.id,
                    type: 'Debit',
                    amount: new Decimal(pay.amount).toNumber(),
                    description: 'Vendor Payment Reversal',
                  },
                  {
                    accountId: apAccount.id,
                    type: 'Credit',
                    amount: new Decimal(pay.amount).toNumber(),
                    description: 'Vendor Payment Reversal',
                  },
                ],
              },
              tx,
            );
          }
        }
      }

      // 3. Update Invoice Outstanding if linked
      if (pay.invoiceId && pay.invoice) {
        const newAmountPaid = new Decimal(pay.invoice.amountPaid).sub(
          new Decimal(pay.amount),
        );
        await tx.invoice.update({
          where: { id: pay.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            status: newAmountPaid.lessThanOrEqualTo(0)
              ? InvoiceStatus.Unpaid
              : InvoiceStatus.Partial,
          },
        });
      }

      // 4. Mark Payment as Cancelled
      await tx.payment.update({
        where: { id },
        data: {
          notes: `CANCELLED: ${reason} (Original: ${pay.notes || ''})`.trim(),
        },
      });

      // 5. Audit log for supplier payments (customer payments log happens inside createJournalEntry invoke flow)
      if (pay.supplierId) {
        await (tx as any).auditLog.create({
          data: {
            tenantId,
            action: 'PAYMENT_CANCELLED',
            resource: `Payment:${pay.id}`,
            details: {
              amount: pay.amount,
              supplierId: pay.supplierId,
              reason,
            },
          },
        });
      }

      // 6. BUG-AUTH-01 FIX: Reverse TDS transactions by creating a reversing entry.
      // Zeroing amounts (previous approach) distorts the historical TDS threshold ledger
      // and breaks forensic auditability. A reversal entry preserves the original record
      // while correctly cancelling its effect on the threshold calculation.
      const tdsEntries = await (tx as any).tdsTransaction.findMany({
        where: { tenantId, paymentId: id },
      });
      for (const entry of tdsEntries) {
        await (tx as any).tdsTransaction.create({
          data: {
            tenantId,
            ruleId: entry.ruleId,
            supplierId: entry.supplierId,
            amount: -Number(entry.amount),
            tdsAmount: -Number(entry.tdsAmount),
            date: new Date(),
            notes: `REVERSAL of TDS entry ${entry.id} for cancelled payment ${id}: ${reason}`,
          },
        });
      }
    });
  }

  async updatePayment(tenantId: string, id: string, data: any) {
    const pay = await this.prisma.payment.findFirst({
      where: { id, tenantId },
    });
    if (!pay) throw new NotFoundException('Payment not found');

    return this.prisma.$transaction(async (tx) => {
      // Audit Guard: Check lock for EXISTING record date inside the transaction
      await this.ledger.checkPeriodLock(tenantId, pay.date, tx);
      // Audit Guard: Check lock for NEW record date if changed
      if (data.date) await this.ledger.checkPeriodLock(tenantId, data.date, tx);

      // FINANCIAL INTEGRITY GUARD: Block direct updates to critical fields
      const criticalFields = [
        'amount',
        'date',
        'invoiceId',
        'customerId',
        'supplierId',
      ];
      for (const field of criticalFields) {
        if (data[field] !== undefined && data[field] !== (pay as any)[field]) {
          throw new BadRequestException(
            `Financial Integrity Violation: Cannot directly update '${field}'. Please cancel and re-create the payment if correction is needed.`,
          );
        }
      }

      return tx.payment.updateMany({
        where: { id, tenantId },
        data,
      });
    });
  }

  async deletePayment(tenantId: string, id: string) {
    return this.cancelPayment(tenantId, id, 'Payment deleted by user');
  }

  async getCustomerLedger(tenantId: string, customerId: string) {
    const [invoices, payments, openingBalances] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, customerId },
        orderBy: { issueDate: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, customerId },
        orderBy: { date: 'asc' },
      }),
      this.prisma.customerOpeningBalance.findMany({
        where: { tenantId, customerId },
      }),
    ]);

    const ledger = [
      ...openingBalances.map((ob) => ({
        id: ob.id,
        date: ob.date,
        type: 'OPENING',
        ref: 'OB',
        debit: Number(ob.amount),
        credit: 0,
      })),
      ...invoices.map((i) => ({
        id: i.id,
        date: i.issueDate,
        type: 'INVOICE',
        ref: i.invoiceNumber,
        debit: new Decimal(i.totalAmount),
        credit: new Decimal(0),
      })),
      ...payments.map((p) => ({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        ref: p.reference || 'PAY',
        debit: new Decimal(0),
        credit: new Decimal(p.amount),
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = new Decimal(0);
    return ledger.map((entry) => {
      balance = balance.add(entry.debit).sub(entry.credit);
      return { ...entry, balance };
    });
  }

  async createCustomerOpeningBalance(tenantId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const existingOb = await tx.customerOpeningBalance.findFirst({
        where: { tenantId, customerId: data.customerId },
      });
      if (existingOb) {
        throw new BadRequestException(
          'Opening balance already exists for this customer.',
        );
      }

      const ob = await tx.customerOpeningBalance.create({
        data: {
          tenantId,
          customerId: data.customerId,
          amount: data.amount,
          date: new Date(data.date || new Date()),
          description: data.description || 'Opening Balance',
        },
      });

      // Dr Accounts Receivable / Cr Opening Balance Equity
      const arAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.ACCOUNTS_RECEIVABLE },
      });
      const obeAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY },
      });

      if (arAccount && obeAccount) {
        await this.ledger.createJournalEntry(
          tenantId,
          {
            date: ob.date.toISOString(),
            description: `Customer Opening Balance: ${data.customerId}`,
            reference: ob.id,
            transactions: [
              {
                accountId: arAccount.id,
                type: 'Debit',
                amount: Number(data.amount),
                description: 'Opening Balance',
              },
              {
                accountId: obeAccount.id,
                type: 'Credit',
                amount: Number(data.amount),
                description: 'Opening Balance',
              },
            ],
          },
          tx,
        );
      }

      return ob;
    });
  }

  async createSupplierOpeningBalance(tenantId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const existingOb = await tx.supplierOpeningBalance.findFirst({
        where: { tenantId, supplierId: data.supplierId },
      });
      if (existingOb) {
        throw new BadRequestException(
          'Opening balance already exists for this supplier.',
        );
      }

      const ob = await tx.supplierOpeningBalance.create({
        data: {
          tenantId,
          supplierId: data.supplierId,
          amount: data.amount,
          date: new Date(data.date || new Date()),
          description: data.description || 'Opening Balance',
        },
      });

      // Dr Opening Balance Equity / Cr Accounts Payable
      const obeAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.OPENING_BALANCE_EQUITY },
      });
      const apAccount = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE },
      });

      if (obeAccount && apAccount) {
        await this.ledger.createJournalEntry(
          tenantId,
          {
            date: ob.date.toISOString(),
            description: `Supplier Opening Balance: ${data.supplierId}`,
            reference: ob.id,
            transactions: [
              {
                accountId: obeAccount.id,
                type: 'Debit',
                amount: Number(data.amount),
                description: 'Opening Balance',
              },
              {
                accountId: apAccount.id,
                type: 'Credit',
                amount: Number(data.amount),
                description: 'Opening Balance',
              },
            ],
          },
          tx,
        );
      }

      return ob;
    });
  }

  async getSupplierLedger(tenantId: string, supplierId: string) {
    const [orders, payments, openingBalances] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { tenantId, supplierId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, supplierId },
        orderBy: { date: 'asc' },
      }),
      this.prisma.supplierOpeningBalance.findMany({
        where: { tenantId, supplierId },
      }),
    ]);

    const ledger = [
      ...openingBalances.map((ob) => ({
        id: ob.id,
        date: ob.date,
        type: 'OPENING',
        ref: 'OB',
        debit: 0,
        credit: Number(ob.amount),
      })),
      ...orders.map((o) => ({
        id: o.id,
        date: o.createdAt,
        type: 'PURCHASE',
        ref: o.orderNumber,
        debit: 0,
        credit: new Decimal(o.totalAmount),
      })),
      ...payments.map((p) => ({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        ref: p.reference || 'PAY',
        debit: new Decimal(p.amount),
        credit: 0,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = new Decimal(0); // Credit normal for suppliers
    return ledger.map((entry) => {
      // Balance = Credit - Debit
      balance = balance.add(entry.credit).sub(entry.debit);
      return { ...entry, balance };
    });
  }
}
