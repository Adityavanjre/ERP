import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { StandardAccounts } from '../constants/account-names';

@Injectable()
export class DebitNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) { }

  async create(tenantId: string, data: any) {
    const { supplierId, purchaseOrderId, noteNumber, items, reason, date, idempotencyKey } = data;

    return this.prisma.$transaction(async (tx) => {
      // 0. Idempotency Guard
      if (idempotencyKey) {
        const existing = await tx.debitNote.findUnique({
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
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      const isInterState = tenant?.state?.toLowerCase() !== supplier?.state?.toLowerCase();

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

      // 2. Create the Debit Note
      const debitNote = await tx.debitNote.create({
        data: {
          tenantId,
          supplierId,
          purchaseOrderId,
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

      // 3. Accounting Impact (Purchase Return)
      const supplierLedger = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE } });
      const purchaseReturnAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.PURCHASE_RETURNS } });

      const cgstAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.INPUT_CGST } });
      const sgstAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.INPUT_SGST } });
      const igstAccount = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.INPUT_IGST } });

      if (supplierLedger && purchaseReturnAccount) {
        const journalTransactions = [
          { accountId: supplierLedger.id, type: 'Debit' as any, amount: totalAmount.toNumber(), description: 'Supplier Debit for Return' },
          { accountId: purchaseReturnAccount.id, type: 'Credit' as any, amount: totalTaxable.toNumber(), description: 'Purchase Return Value' },
        ];

        if (isInterState && igstAccount) {
          journalTransactions.push({ accountId: igstAccount.id, type: 'Credit', amount: totalIGST.toNumber(), description: 'IGST ITC Reversal' });
        } else if (!isInterState && cgstAccount && sgstAccount) {
          journalTransactions.push({ accountId: cgstAccount.id, type: 'Credit', amount: totalCGST.toNumber(), description: 'CGST ITC Reversal' });
          journalTransactions.push({ accountId: sgstAccount.id, type: 'Credit', amount: totalSGST.toNumber(), description: 'SGST ITC Reversal' });
        }

        const journal = await this.ledger.createJournalEntry(tenantId, {
          date: debitNote.date.toISOString(),
          description: `Debit Note: ${noteNumber} (Return for PO ${purchaseOrderId || 'Direct'})`,
          reference: debitNote.id,
          transactions: journalTransactions as any,
        }, tx);

        await tx.debitNote.update({
          where: { id: debitNote.id },
          data: { journalEntryId: journal.id },
        });
      }

      // 4. Warehouse & Stock Synchronization
      const warehouse = await tx.warehouse.findFirst({
        where: { tenantId, name: 'Main Warehouse' }
      });

      for (const item of enrichedItems) {
        // Decrement Master Stock
        await tx.product.update({
          where: { id: item.productId, tenantId },
          data: { stock: { decrement: item.quantity } },
        });

        // Decrement Location Stock
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
            update: { quantity: { decrement: item.quantity } },
            create: {
              tenantId,
              productId: item.productId,
              warehouseId: warehouse.id,
              quantity: item.quantity.negated(),
              notes: ''
            } as any
          });


          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId: warehouse.id,
              quantity: item.quantity,
              type: 'OUT',
              reference: noteNumber,
              notes: `Purchase Return (DN)`
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'DEBIT_NOTE_CREATED',
          resource: `DebitNote:${debitNote.id}`,
          details: { noteNumber, supplierId, purchaseOrderId, amount: totalAmount.toNumber() } as any,
        },
      });

      return debitNote;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.debitNote.findMany({
      where: { tenantId },
      include: { supplier: true, purchaseOrder: true, items: { include: { product: true } } },
      orderBy: { date: 'desc' },
    });
  }
}
