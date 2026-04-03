import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from '../accounting/services/ledger.service';
import { StandardAccounts } from '../accounting/constants/account-names';
import { TraceService } from '../common/services/trace.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PurchaseBillService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private readonly traceService: TraceService,
  ) {}

  async create(
    tenantId: string,
    data: {
      supplierId: string;
      billNumber: string;
      billDate: string;
      dueDate?: string;
      purchaseOrderId?: string;
      documentUrl?: string;
      notes?: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        gstRate?: number;
        hsnCode?: string;
      }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.ledger.checkPeriodLock(tenantId, data.billDate, tx);

      // Validate supplier exists
      const supplier = await tx.supplier.findFirst({
        where: { id: data.supplierId, tenantId, isDeleted: false },
      });
      if (!supplier) throw new NotFoundException('Supplier not found.');

      // Check for duplicate bill number
      const existing = await (tx as any).purchaseBill.findFirst({
        where: { tenantId, billNumber: data.billNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `Purchase Bill with number "${data.billNumber}" already exists.`,
        );
      }

      // Determine inter-state based on tenant and supplier states
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { state: true },
      });
      const isInterState =
        tenant?.state?.trim().toLowerCase() !==
        supplier.state?.trim().toLowerCase();

      // Compute GST per item
      let totalTaxable = new Decimal(0);
      let totalGST = new Decimal(0);
      let totalCGST = new Decimal(0);
      let totalSGST = new Decimal(0);
      let totalIGST = new Decimal(0);

      const enrichedItems = await Promise.all(
        data.items.map(async (item) => {
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId, isDeleted: false },
            select: { gstRate: true, hsnCode: true },
          });
          const qty = new Decimal(item.quantity);
          const unitPrice = new Decimal(item.unitPrice);
          const taxable = this.ledger.round2(qty.mul(unitPrice));
          const gstRate = new Decimal(product?.gstRate ?? item.gstRate ?? 0);
          const gstAmount = this.ledger.round2(taxable.mul(gstRate).div(100));

          const cgst = isInterState
            ? new Decimal(0)
            : gstAmount.div(2).toDecimalPlaces(2, Decimal.ROUND_DOWN);
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
            quantity: qty,
            unitPrice,
            taxableAmount: taxable,
            gstRate,
            cgstAmount: cgst,
            sgstAmount: sgst,
            igstAmount: igst,
            totalAmount: this.ledger.round2(taxable.add(gstAmount)),
            hsnCode: product?.hsnCode || item.hsnCode || null,
          };
        }),
      );

      const grandTotal = this.ledger.round2(totalTaxable.add(totalGST));

      // Create the Purchase Bill
      const bill = await (tx as any).purchaseBill.create({
        data: {
          tenantId,
          supplierId: data.supplierId,
          billNumber: data.billNumber,
          billDate: new Date(data.billDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          purchaseOrderId: data.purchaseOrderId || null,
          documentUrl: data.documentUrl || null,
          notes: data.notes || null,
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

      // GL Entry: Dr Inventory, Dr GST Receivable (ITC), Cr Accounts Payable
      const inventoryAcc = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.INVENTORY_ASSET },
      });
      const apAcc = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.ACCOUNTS_PAYABLE },
      });
      const gstRecvAcc = await tx.account.findFirst({
        where: { tenantId, name: StandardAccounts.GST_RECEIVABLE },
      });

      if (inventoryAcc && apAcc) {
        const transactions: Array<{
          accountId: string;
          type: 'Debit' | 'Credit';
          amount: number;
          description: string;
        }> = [];

        // Dr Inventory (taxable value)
        transactions.push({
          accountId: inventoryAcc.id,
          type: 'Debit',
          amount: totalTaxable.toNumber(),
          description: `Purchase Bill ${data.billNumber} - Inventory`,
        });

        // Dr GST Receivable (ITC) if GST applicable
        if (totalGST.greaterThan(0) && gstRecvAcc) {
          if (isInterState) {
            transactions.push({
              accountId: gstRecvAcc.id,
              type: 'Debit',
              amount: totalIGST.toNumber(),
              description: `Purchase Bill ${data.billNumber} - IGST ITC`,
            });
          } else {
            if (totalCGST.greaterThan(0)) {
              transactions.push({
                accountId: gstRecvAcc.id,
                type: 'Debit',
                amount: totalCGST.toNumber(),
                description: `Purchase Bill ${data.billNumber} - CGST ITC`,
              });
            }
            if (totalSGST.greaterThan(0)) {
              transactions.push({
                accountId: gstRecvAcc.id,
                type: 'Debit',
                amount: totalSGST.toNumber(),
                description: `Purchase Bill ${data.billNumber} - SGST ITC`,
              });
            }
          }
        }

        // Cr Accounts Payable (full amount including GST)
        transactions.push({
          accountId: apAcc.id,
          type: 'Credit',
          amount: grandTotal.toNumber(),
          description: `Purchase Bill ${data.billNumber} - AP`,
        });

        const journalEntry = await this.ledger.createJournalEntry(
          tenantId,
          {
            date: data.billDate,
            description: `Purchase Bill: ${data.billNumber} - ${supplier.name}`,
            reference: `PB-${bill.id.slice(0, 8)}`,
            transactions,
            correlationId: this.traceService.getCorrelationId(),
          } as any,
          tx,
        );

        // Link journal entry to purchase bill
        await (tx as any).purchaseBill.update({
          where: { id: bill.id },
          data: { journalEntryId: journalEntry.id },
        });
      }

      return bill;
    });
  }

  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    supplierId?: string,
    status?: string,
  ) {
    const where: any = { tenantId };
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [bills, total] = await Promise.all([
      (this.prisma as any).purchaseBill.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, gstin: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.prisma as any).purchaseBill.count({ where }),
    ]);

    return {
      data: bills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string) {
    const bill = await (this.prisma as any).purchaseBill.findFirst({
      where: { id, tenantId },
      include: {
        supplier: {
          select: { id: true, name: true, gstin: true, state: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, hsnCode: true },
            },
          },
        },
        journalEntry: {
          select: { id: true, reference: true, description: true },
        },
        purchaseOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    });

    if (!bill) throw new NotFoundException('Purchase Bill not found.');
    return bill;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const bill = await (this.prisma as any).purchaseBill.findFirst({
      where: { id, tenantId },
    });

    if (!bill) throw new NotFoundException('Purchase Bill not found.');

    const validTransitions: Record<string, string[]> = {
      Unpaid: ['Partial', 'Paid', 'Cancelled'],
      Partial: ['Paid', 'Cancelled'],
      Paid: [],
      Cancelled: [],
    };

    if (!validTransitions[bill.status]?.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${bill.status} to ${status}.`,
      );
    }

    return (this.prisma as any).purchaseBill.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }
}
