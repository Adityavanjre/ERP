import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMode, AccountType, InvoiceStatus } from '@prisma/client';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

  async createPayment(tenantId: string, data: CreatePaymentDto) {
    if (!data.customerId && !data.supplierId) {
      throw new BadRequestException('Recipient identity required (Customer or Supplier).');
    }

    if (new Decimal(data.amount).lessThanOrEqualTo(0)) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ledger.checkPeriodLock(tenantId, data.date || new Date(), tx);

      if (data.idempotencyKey) {
        const existing = await tx.payment.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) return existing;
      }

      const bankAccount = await tx.account.findFirst({
        where: { tenantId, type: AccountType.Asset, name: { contains: 'Bank' } },
      });
      const arAccount = await tx.account.findFirst({
        where: { tenantId, type: AccountType.Asset, name: 'Accounts Receivable' },
      });
      const apAccount = await tx.account.findFirst({
        where: { tenantId, type: AccountType.Liability, name: 'Accounts Payable' },
      });

      if (!bankAccount) throw new BadRequestException("Missing 'Bank' account.");

      let payment;
      if (data.customerId) {
        if (!arAccount) throw new BadRequestException("Missing 'Accounts Receivable' account.");

        let invoice: any = null;
        if (data.invoiceId) {
          invoice = await tx.invoice.findFirst({ where: { id: data.invoiceId, tenantId } });
          if (!invoice) throw new NotFoundException('Invoice not found');
          if (invoice.isLocked) throw new BadRequestException('This invoice is locked.');

          const outstanding = this.ledger.round2(new Decimal(invoice.totalAmount).sub(new Decimal(invoice.amountPaid)));
          if (new Decimal(data.amount).greaterThan(outstanding.add(new Decimal('0.001')))) {
            throw new BadRequestException(`Payment ₹${data.amount} exceeds outstanding ₹${this.ledger.round2(outstanding)}`);
          }
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
          },
        });

        if (invoice) {
          const newAmountPaid = this.ledger.round2(new Decimal(invoice.amountPaid).add(new Decimal(data.amount)));
          const totalAmt = new Decimal(invoice.totalAmount);
          const isFullyPaid = newAmountPaid.greaterThanOrEqualTo(totalAmt.sub(new Decimal('0.01')));

          await tx.invoice.update({
            where: { id: invoice.id },
            data: { amountPaid: newAmountPaid, status: isFullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Partial },
          });
        }

        await tx.journalEntry.create({
          data: {
            tenantId,
            date: payment.date,
            description: `Payment Recv: ${payment.reference || 'REF-' + payment.id.slice(0, 8)}`,
            reference: payment.reference,
            posted: true,
            transactions: {
              create: [
                { tenantId, accountId: bankAccount.id, type: 'Debit', amount: data.amount, description: 'Customer Payment' },
                { tenantId, accountId: arAccount.id, type: 'Credit', amount: data.amount, description: 'Customer Payment' },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: bankAccount.id }, data: { balance: { increment: data.amount } } });
        await tx.account.update({ where: { id: arAccount.id }, data: { balance: { decrement: data.amount } } });

        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'PAYMENT_RECEIVED',
            resource: `Payment:${payment.id}`,
            details: { amount: data.amount, mode: data.mode, invoiceId: data.invoiceId, reference: data.reference } as any,
          },
        });
      } else {
        if (!apAccount) throw new BadRequestException("Missing 'Accounts Payable' account.");
        payment = await tx.payment.create({
          data: {
            tenantId,
            supplierId: data.supplierId,
            amount: data.amount,
            date: new Date(data.date || new Date()),
            mode: data.mode,
            reference: data.reference,
            notes: data.notes,
            idempotencyKey: data.idempotencyKey,
          },
        });

        await tx.journalEntry.create({
          data: {
            tenantId,
            date: payment.date,
            description: `Vendor Payment: ${payment.reference || 'REF-' + payment.id.slice(0, 8)}`,
            reference: payment.reference,
            posted: true,
            transactions: {
              create: [
                { tenantId, accountId: apAccount.id, type: 'Debit', amount: data.amount, description: 'Supplier Payment' },
                { tenantId, accountId: bankAccount.id, type: 'Credit', amount: data.amount, description: 'Supplier Payment' },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: apAccount.id }, data: { balance: { decrement: data.amount } } });
        await tx.account.update({ where: { id: bankAccount.id }, data: { balance: { decrement: data.amount } } });
      }

      return payment;
    });
  }

  async updatePayment(tenantId: string, id: string, data: any) {
    const pay = await this.prisma.payment.findFirst({
      where: { id, tenantId },
    });
    if (!pay) throw new NotFoundException('Payment not found');

    // Audit Guard: Check lock for EXISTING record date
    await this.ledger.checkPeriodLock(tenantId, pay.date);
    // Audit Guard: Check lock for NEW record date if changed
    if (data.date) await this.ledger.checkPeriodLock(tenantId, data.date);

    return this.prisma.payment.update({
      where: { id },
      data,
    });
  }

  async deletePayment(tenantId: string, id: string) {
    const pay = await this.prisma.payment.findFirst({
      where: { id, tenantId },
    });
    if (!pay) throw new NotFoundException('Payment not found');

    await this.ledger.checkPeriodLock(tenantId, pay.date);

    // In double-entry, we don't just "delete". We must reverse or mark as cancelled.
    return this.prisma.payment.update({
      where: { id },
      data: { notes: `CANCELLED: ${pay.notes || ''}`.trim() },
    });
  }

  async getCustomerLedger(tenantId: string, customerId: string) {
    const [invoices, payments, openingBalances] = await Promise.all([
      this.prisma.invoice.findMany({ where: { tenantId, customerId }, orderBy: { issueDate: 'asc' } }),
      this.prisma.payment.findMany({ where: { tenantId, customerId }, orderBy: { date: 'asc' } }),
      this.prisma.customerOpeningBalance.findMany({ where: { tenantId, customerId } }),
    ]);

    const ledger = [
      ...openingBalances.map((ob) => ({ id: ob.id, date: ob.date, type: 'OPENING', ref: 'OB', debit: Number(ob.amount), credit: 0 })),
      ...invoices.map((i) => ({ id: i.id, date: i.issueDate, type: 'INVOICE', ref: i.invoiceNumber, debit: new Decimal(i.totalAmount), credit: new Decimal(0) })),
      ...payments.map((p) => ({ id: p.id, date: p.date, type: 'PAYMENT', ref: p.reference || 'PAY', debit: new Decimal(0), credit: new Decimal(p.amount) })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = new Decimal(0);
    return ledger.map((entry) => {
      balance = balance.add(entry.debit).sub(entry.credit);
      return { ...entry, balance };
    });
  }
}
