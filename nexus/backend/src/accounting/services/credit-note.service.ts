import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { StandardAccounts } from '../constants/account-names';

@Injectable()
export class CreditNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) { }

  async create(tenantId: string, data: any) {
    const { customerId, invoiceId, noteNumber, items, reason, date, idempotencyKey } = data;

    return this.prisma.$transaction(async (tx) => {
      // 0. Idempotency Guard
      if (idempotencyKey) {
        const existing = await tx.creditNote.findUnique({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } } as any
        });
        if (existing) return existing;
      }
      // 1. Calculate totals with precision
      let totalTaxable = new Decimal(0);
      let totalGST = new Decimal(0);
      let totalCGST = new Decimal(0);
      let totalSGST = new Decimal(0);
      let totalIGST = new Decimal(0);

      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      const isInterState = tenant?.state?.toLowerCase() !== customer?.state?.toLowerCase();

      const enrichedItems = items.map((item: any) => {
        const taxable = this.ledger.round2(new Decimal(item.taxableAmount));
        const gstTotal = this.ledger.round2(taxable.mul(item.gstRate).div(100));
        totalTaxable = totalTaxable.add(taxable);
        totalGST = totalGST.add(gstTotal);

        let itemCgst = new Decimal(0);
        let itemSgst = new Decimal(0);
        let itemIgst = new Decimal(0);

        if (isInterState) {
          totalIGST = totalIGST.add(gstTotal);
          itemIgst = gstTotal;
        } else {
          const cgst = gstTotal.div(2).toDecimalPlaces(2, Decimal.ROUND_DOWN);
          const sgst = gstTotal.sub(cgst);
          totalCGST = totalCGST.add(cgst);
          totalSGST = totalSGST.add(sgst);
          itemCgst = cgst;
          itemSgst = sgst;
        }

        return {
          tenantId,
          productId: item.productId,
          quantity: new Decimal(item.quantity),
          unitPrice: new Decimal(item.unitPrice),
          taxableAmount: taxable,
          gstRate: new Decimal(item.gstRate),
          gstAmount: gstTotal,
          cgstAmount: itemCgst,
          sgstAmount: itemSgst,
          igstAmount: itemIgst,
          totalAmount: this.ledger.round2(taxable.add(gstTotal)),
        };
      });

      const totalAmount = this.ledger.round2(totalTaxable.add(totalGST));

      // 2. Create the Credit Note
      const creditNote = await tx.creditNote.create({
        data: {
          tenantId,
          customerId,
          invoiceId,
          noteNumber,
          date: new Date(date || new Date()),
          totalAmount,
          totalTaxable,
          totalGST,
          totalCGST,
          totalSGST,
          totalIGST,
          reason,
          idempotencyKey,
          items: {
            create: enrichedItems,
          },
        } as any,
      });

      // 3. Automated Accounting Impact (Sales Return)
      const salesReturnAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.SALES_RETURNS } });
      const customerLedger = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.ACCOUNTS_RECEIVABLE } });

      const cgstAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OUTPUT_CGST } });
      const sgstAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OUTPUT_SGST } });
      const igstAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.OUTPUT_IGST } });

      if (salesReturnAccount && customerLedger) {
        const journalTransactions = [
          { accountId: salesReturnAccount.id, type: 'Debit' as any, amount: totalTaxable.toNumber(), description: 'Sales Return Value' },
          { accountId: customerLedger.id, type: 'Credit' as any, amount: totalAmount.toNumber(), description: 'Customer Credit for Return' },
        ];

        if (isInterState && igstAccount) {
          journalTransactions.push({ accountId: igstAccount.id, type: 'Debit', amount: totalIGST.toNumber(), description: 'IGST Reversal' });
        } else if (!isInterState && cgstAccount && sgstAccount) {
          journalTransactions.push({ accountId: cgstAccount.id, type: 'Debit', amount: totalCGST.toNumber(), description: 'CGST Reversal' });
          journalTransactions.push({ accountId: sgstAccount.id, type: 'Debit', amount: totalSGST.toNumber(), description: 'SGST Reversal' });
        }

        const journal = await this.ledger.createJournalEntry(tenantId, {
          date: creditNote.date.toISOString(),
          description: `Credit Note: ${noteNumber} (Return for ${invoiceId || 'Direct'})`,
          reference: creditNote.id,
          transactions: journalTransactions as any,
        }, tx);

        await tx.creditNote.update({
          where: { id: creditNote.id },
          data: { journalEntryId: journal.id },
        });
      }

      // 4. Warehouse & Stock Synchronization
      const warehouse = await tx.warehouse.findFirst({
        where: { tenantId, name: 'Main Warehouse' }
      });

      for (const item of enrichedItems) {
        // Increment Master Stock
        await tx.product.update({
          where: { id: item.productId, tenantId },
          data: { stock: { increment: item.quantity } },
        });

        // Increment Location Stock (Returns go to Main Warehouse by default)
        if (warehouse) {
          await tx.stockLocation.upsert({
            where: {
              tenantId_productId_warehouseId_notes: {
                tenantId,
                productId: item.productId,
                warehouseId: warehouse.id,
                notes: ''
              }
            } as any,
            update: { quantity: { increment: item.quantity } },
            create: {
              tenantId,
              productId: item.productId,
              warehouseId: warehouse.id,
              quantity: item.quantity,
              notes: ''
            } as any
          });

          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId: warehouse.id,
              quantity: item.quantity,
              type: 'IN',
              reference: noteNumber,
              notes: `Sales Return (CN)`
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'CREDIT_NOTE_CREATED',
          resource: `CreditNote:${creditNote.id}`,
          details: { noteNumber, customerId, invoiceId, amount: totalAmount.toNumber() } as any,
        },
      });

      return creditNote;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.creditNote.findMany({
      where: { tenantId },
      include: { customer: true, invoice: true, items: { include: { product: true } } },
      orderBy: { date: 'desc' },
    });
  }
}
