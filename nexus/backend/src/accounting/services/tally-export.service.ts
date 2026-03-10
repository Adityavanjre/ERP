import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, InvoiceStatus, POStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';
import { StandardAccounts } from '../constants/account-names';
import { mapTallyState } from '../../common/utils/tally-state-mapper.util';

@Injectable()
export class TallyService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) { }

  private escapeXml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/[<>&"']/g, (c) => {
        switch (c) {
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '&':
            return '&amp;';
          case '"':
            return '&quot;';
          case "'":
            return '&apos;';
          default:
            return c;
        }
      })
      .trim();
  }

  async validateTallyData(tenantId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [tenant, invoices, purchases, payments] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          issueDate: { gte: startDate, lte: endDate },
          status: { not: 'Cancelled' },
        },
        include: { customer: true, items: { include: { product: true } } },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          orderDate: { gte: startDate, lte: endDate },
          status: POStatus.Received,
        },
        include: { supplier: true, items: { include: { product: true } } },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: { customer: true, supplier: true, invoice: true },
      }),
    ]);

    const errors: string[] = [];
    const warnings: string[] = [];
    const vchNumbers = new Set<string>();
    let hsnCoverage = 0;
    let totalItems = 0;

    const summary: any = {
      totalSales: 0,
      totalGST: 0,
      totalPurchases: 0,
      totalReceipts: 0,
      totalPayments: 0,
      netBalanceDr: 0,
      netBalanceCr: 0,
      status: 'PENDING',
      totalInvoices: invoices.length,
      backdatedCount: 0,
    };

    for (const inv of invoices) {
      const invNo = inv.invoiceNumber.trim();
      if (vchNumbers.has(invNo))
        errors.push(`BLOCKER: Duplicate Invoice Number: ${invNo}`);
      vchNumbers.add(invNo);

      summary.totalSales += Number(inv.totalTaxable);
      summary.totalGST += Number(inv.totalGST);
      summary.netBalanceDr += Number(inv.totalAmount);

      for (const item of inv.items) {
        totalItems++;
        if (item.product.hsnCode) hsnCoverage++;
        else
          warnings.push(
            `Invoice #${inv.invoiceNumber}: Product ${item.product.name} missing HSN Code.`,
          );
      }

      // Balance Check
      const itemsSum = inv.items.reduce(
        (s, i) => s.add(i.taxableAmount),
        new Decimal(0),
      );
      const taxSum = inv.totalCGST.add(inv.totalSGST).add(inv.totalIGST);
      const diff = inv.totalAmount.minus(itemsSum.add(taxSum)).abs();
      if (diff.gt(0.011)) {
        errors.push(
          `BLOCKER: Imbalanced Voucher ${invNo}. Drift: ${diff.toFixed(2)}`,
        );
      }

      // Backdating Check (Generic Risk)
      const dayDiff =
        Math.abs(inv.issueDate.getTime() - inv.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      if (dayDiff > 2) {
        summary.backdatedCount++;
      }
    }

    if (summary.backdatedCount > 0) {
      warnings.push(
        `Risk: ${summary.backdatedCount} backdated invoices detected (Issue date vs entry date > 2 days).`,
      );
    }

    for (const po of purchases) {
      summary.totalPurchases += Number(po.totalAmount);
      summary.netBalanceCr += Number(po.totalAmount);
    }

    for (const pay of payments) {
      if (pay.customerId) {
        summary.totalReceipts += Number(pay.amount);
        summary.netBalanceDr -= Number(pay.amount);
      } else {
        summary.totalPayments += Number(pay.amount);
        summary.netBalanceCr -= Number(pay.amount);
      }
    }

    summary.status = errors.length > 0 ? 'FAIL' : 'PASS';
    const coverageScore =
      totalItems > 0 ? (hsnCoverage / totalItems) * 100 : 100;

    const riskFlags = [];
    const negStock = await this.prisma.product.count({
      where: { tenantId, stock: { lt: 0 }, isDeleted: false },
    });
    if (negStock > 0)
      riskFlags.push({
        type: 'NEGATIVE_STOCK',
        count: negStock,
        severity: 'BLOCKER',
      });

    if (summary.backdatedCount > 0) {
      riskFlags.push({
        type: 'BACKDATED',
        count: summary.backdatedCount,
        severity: 'MEDIUM',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary,
      riskFlags,
      hsnCoverage: coverageScore,
      confidenceScore: Math.max(
        0,
        100 -
        errors.length * 15 -
        riskFlags.filter((f) => f.severity === 'BLOCKER').length * 25,
      ),
    };
  }

  async getStats(tenantId: string) {
    const totalReceivable = await this.prisma.invoice.aggregate({
      where: { tenantId, status: InvoiceStatus.Unpaid },
      _sum: { totalAmount: true },
    });

    const partiallyPaid = await this.prisma.invoice.findMany({
      where: { tenantId, status: InvoiceStatus.Partial },
    });
    const partialAmount = partiallyPaid.reduce(
      (sum, inv) =>
        sum.add(new Decimal(inv.totalAmount).sub(new Decimal(inv.amountPaid))),
      new Decimal(0),
    );

    const income = await this.prisma.account.aggregate({
      where: { tenantId, type: AccountType.Revenue },
      _sum: { balance: true },
    });

    const expenses = await this.prisma.account.aggregate({
      where: { tenantId, type: AccountType.Expense },
      _sum: { balance: true },
    });

    const gstLiability = await this.prisma.invoice.aggregate({
      where: { tenantId },
      _sum: { totalGST: true },
    });

    const overdue = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: [InvoiceStatus.Unpaid, InvoiceStatus.Partial] },
        dueDate: { lt: new Date() },
      },
    });

    const overdueAmount = overdue.reduce(
      (sum, inv) =>
        sum.add(new Decimal(inv.totalAmount).sub(new Decimal(inv.amountPaid))),
      new Decimal(0),
    );

    const totalPayable = await this.prisma.purchaseOrder.aggregate({
      where: { tenantId, status: POStatus.Received },
      _sum: { totalAmount: true },
    });

    const baseReceivable = new Decimal(totalReceivable._sum.totalAmount ?? 0);
    const basePayable = new Decimal(totalPayable._sum.totalAmount ?? 0);
    const baseIncome = new Decimal(income._sum.balance ?? 0);
    const baseExpenses = new Decimal(expenses._sum.balance ?? 0);
    const baseGst = new Decimal(gstLiability._sum.totalGST ?? 0);

    return {
      receivable: this.ledger.round2(baseReceivable.add(partialAmount)),
      payable: this.ledger.round2(basePayable),
      overdueAmount: this.ledger.round2(overdueAmount),
      income: this.ledger.round2(baseIncome),
      expenses: this.ledger.round2(baseExpenses),
      gstLiability: this.ledger.round2(baseGst),
      netProfit: this.ledger.round2(baseIncome.sub(baseExpenses)),
    };
  }

  async *generateTallyXmlStream(
    tenantId: string,
    month?: number,
    year?: number,
  ) {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    yield `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    const BATCH_SIZE = 100;

    // 1. Export Sales Invoices (Batched)
    let invSkip = 0;
    while (true) {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          issueDate: { gte: startDate, lte: endDate },
          status: { not: 'Cancelled' },
        },
        include: { customer: true, items: { include: { product: true } } },
        take: BATCH_SIZE,
        skip: invSkip,
        orderBy: { issueDate: 'asc' },
      });

      if (invoices.length === 0) break;

      for (const inv of invoices) {
        let chunk = '';
        const dateStr = inv.issueDate
          .toISOString()
          .split('T')[0]
          .replace(/-/g, '');
        const guid = `INV-${inv.id}`;
        const partyName = this.escapeXml(
          inv.customer?.company || inv.customer?.firstName || 'Cash Sales',
        );

        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="AccountingVchView">\n`;
        chunk += `            <DATE>${dateStr}</DATE>\n`;
        chunk += `            <VOUCHERNUMBER>${this.escapeXml(inv.invoiceNumber)}</VOUCHERNUMBER>\n`;
        chunk += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
        chunk += `            <PERSISTEDVIEW>AccountingVchView</PERSISTEDVIEW>\n`;
        chunk += `            <GUID>${guid}</GUID>\n`;

        // Dr Customer
        chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
        chunk += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
        chunk += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        chunk += `              <AMOUNT>-${inv.totalAmount}</AMOUNT>\n`;
        chunk += `              <BILLALLOCATIONS.LIST>\n`;
        chunk += `                <NAME>${this.escapeXml(inv.invoiceNumber)}</NAME>\n`;
        chunk += `                <BILLTYPE>New Ref</BILLTYPE>\n`;
        chunk += `                <AMOUNT>-${inv.totalAmount}</AMOUNT>\n`;
        chunk += `              </BILLALLOCATIONS.LIST>\n`;
        chunk += `            </ALLLEDGERENTRIES.LIST>\n`;

        // Cr Inventory per item
        for (const item of inv.items) {
          chunk += `            <INVENTORYENTRIES.LIST>\n`;
          chunk += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
          chunk += `              <RATE>${item.unitPrice}</RATE>\n`;
          chunk += `              <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n`;
          chunk += `              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
          chunk += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.SALES)}</LEDGERNAME>\n`;
          chunk += `                <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
          chunk += `                <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `            </INVENTORYENTRIES.LIST>\n`;
        }

        // Tax Ledgers
        let taxSum = new Decimal(0);
        if (inv.totalIGST.greaterThan(0)) {
          chunk += this.generateTaxLedger(
            StandardAccounts.OUTPUT_IGST,
            inv.totalIGST,
            true,
          );
          taxSum = taxSum.add(inv.totalIGST);
        } else {
          if (inv.totalCGST.greaterThan(0)) {
            chunk += this.generateTaxLedger(
              StandardAccounts.OUTPUT_CGST,
              inv.totalCGST,
              true,
            );
            taxSum = taxSum.add(inv.totalCGST);
          }
          if (inv.totalSGST.greaterThan(0)) {
            chunk += this.generateTaxLedger(
              StandardAccounts.OUTPUT_SGST,
              inv.totalSGST,
              true,
            );
            taxSum = taxSum.add(inv.totalSGST);
          }
        }

        // Rounding Ledger
        const totalItemsAndTax = inv.items
          .reduce((sum, item) => sum.add(item.taxableAmount), new Decimal(0))
          .add(taxSum);
        const diff = inv.totalAmount.minus(totalItemsAndTax);
        if (diff.abs().greaterThan(0)) {
          chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
          chunk += `              <LEDGERNAME>${this.escapeXml(StandardAccounts.ROUNDING_OFF)}</LEDGERNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>${diff.isPositive() ? 'NO' : 'YES'}</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <AMOUNT>${diff.isPositive() ? diff.abs() : diff.abs().negated()}</AMOUNT>\n`;
          chunk += `            </ALLLEDGERENTRIES.LIST>\n`;
        }

        chunk += `          </VOUCHER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      invSkip += BATCH_SIZE;
    }

    // 2. Export Purchase Invoices (Received POs) - Batched
    let purSkip = 0;
    while (true) {
      const purchases = await this.prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          orderDate: { gte: startDate, lte: endDate },
          status: POStatus.Received,
        },
        include: { supplier: true, items: { include: { product: true } } },
        take: BATCH_SIZE,
        skip: purSkip,
        orderBy: { orderDate: 'asc' },
      });

      if (purchases.length === 0) break;

      for (const po of purchases) {
        let chunk = '';
        const dateStr = po.orderDate
          .toISOString()
          .split('T')[0]
          .replace(/-/g, '');
        const guid = `PUR-${po.id}`;
        const partyName = this.escapeXml(po.supplier?.name || 'Supplier');

        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <VOUCHER VCHTYPE="Purchases" ACTION="Create" OBJVIEW="AccountingVchView">\n`;
        chunk += `            <DATE>${dateStr}</DATE>\n`;
        chunk += `            <VOUCHERNUMBER>${this.escapeXml(po.orderNumber)}</VOUCHERNUMBER>\n`;
        chunk += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
        chunk += `            <PERSISTEDVIEW>AccountingVchView</PERSISTEDVIEW>\n`;
        chunk += `            <GUID>${guid}</GUID>\n`;

        // Cr Supplier (Net)
        const netAmount = (po as any).netAmount || po.totalAmount;
        const tdsAmount = (po as any).tdsAmount || 0;

        chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
        chunk += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
        chunk += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        chunk += `              <AMOUNT>${netAmount}</AMOUNT>\n`;
        chunk += `              <BILLALLOCATIONS.LIST>\n`;
        chunk += `                <NAME>${this.escapeXml(po.orderNumber)}</NAME>\n`;
        chunk += `                <BILLTYPE>New Ref</BILLTYPE>\n`;
        chunk += `                <AMOUNT>${netAmount}</AMOUNT>\n`;
        chunk += `              </BILLALLOCATIONS.LIST>\n`;
        chunk += `            </ALLLEDGERENTRIES.LIST>\n`;

        // TDS Entry
        if (new Decimal(tdsAmount).gt(0)) {
          chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
          chunk += `              <LEDGERNAME>${this.escapeXml(StandardAccounts.TDS_PAYABLE)}</LEDGERNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <AMOUNT>${tdsAmount}</AMOUNT>\n`;
          chunk += `            </ALLLEDGERENTRIES.LIST>\n`;
        }

        // Dr Inventory per item
        for (const item of po.items) {
          chunk += `            <INVENTORYENTRIES.LIST>\n`;
          chunk += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
          chunk += `              <RATE>${item.unitPrice}</RATE>\n`;
          chunk += `              <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n`;
          chunk += `              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
          chunk += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.INVENTORY_ASSET)}</LEDGERNAME>\n`;
          chunk += `                <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
          chunk += `                <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `            </INVENTORYENTRIES.LIST>\n`;
        }

        // Tax Ledgers (Input GST)
        if (po.totalIGST.greaterThan(0)) {
          chunk += this.generateTaxLedger(
            StandardAccounts.INPUT_IGST,
            po.totalIGST,
            false,
          );
        } else {
          if (po.totalCGST.greaterThan(0))
            chunk += this.generateTaxLedger(
              StandardAccounts.INPUT_CGST,
              po.totalCGST,
              false,
            );
          if (po.totalSGST.greaterThan(0))
            chunk += this.generateTaxLedger(
              StandardAccounts.INPUT_SGST,
              po.totalSGST,
              false,
            );
        }

        chunk += `          </VOUCHER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      purSkip += BATCH_SIZE;
    }

    // 3. Export Payments & Receipts - Batched
    let paySkip = 0;
    while (true) {
      const payments = await this.prisma.payment.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: { customer: true, supplier: true, invoice: true },
        take: BATCH_SIZE,
        skip: paySkip,
        orderBy: { date: 'asc' },
      });

      if (payments.length === 0) break;

      for (const pay of payments) {
        let chunk = '';
        const isReceipt = !!pay.customerId;
        const dateStr = pay.date.toISOString().split('T')[0].replace(/-/g, '');
        const partyName = isReceipt
          ? this.escapeXml(
            pay.customer?.company || pay.customer?.firstName || 'Customer',
          )
          : this.escapeXml(pay.supplier?.name || 'Supplier');
        const refNo = this.escapeXml(
          pay.reference ||
          (isReceipt ? 'RECT-' : 'PAY-') + pay.id.substring(0, 8),
        );
        const vchType = isReceipt ? 'Receipt' : 'Payment';

        const payAmount = new Decimal(pay.amount);
        const tdsAmount = new Decimal((pay as any).tdsAmount || 0);
        const netAmount = payAmount.minus(tdsAmount);

        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <VOUCHER VCHTYPE="${vchType}" ACTION="Create">\n`;
        chunk += `            <DATE>${dateStr}</DATE>\n`;
        chunk += `            <VOUCHERNUMBER>${refNo}</VOUCHERNUMBER>\n`;
        chunk += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;

        // Bank/Cash entry (Net)
        chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
        chunk += `              <LEDGERNAME>${this.escapeXml(pay.mode === 'Cash' ? StandardAccounts.CASH : StandardAccounts.BANK)}</LEDGERNAME>\n`;
        chunk += `              <ISDEEMEDPOSITIVE>${isReceipt ? 'YES' : 'NO'}</ISDEEMEDPOSITIVE>\n`;
        chunk += `              <AMOUNT>${isReceipt ? '-' : ''}${netAmount}</AMOUNT>\n`;
        chunk += `            </ALLLEDGERENTRIES.LIST>\n`;

        // TDS Entry
        if (tdsAmount.gt(0)) {
          chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
          chunk += `              <LEDGERNAME>${this.escapeXml(StandardAccounts.TDS_PAYABLE)}</LEDGERNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <AMOUNT>${tdsAmount}</AMOUNT>\n`;
          chunk += `            </ALLLEDGERENTRIES.LIST>\n`;
        }

        // Party entry (Gross)
        chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
        chunk += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
        chunk += `              <ISDEEMEDPOSITIVE>${isReceipt ? 'NO' : 'YES'}</ISDEEMEDPOSITIVE>\n`;
        chunk += `              <AMOUNT>${isReceipt ? '' : '-'}${payAmount}</AMOUNT>\n`;
        if (pay.invoice) {
          chunk += `              <BILLALLOCATIONS.LIST>\n`;
          chunk += `                <NAME>${this.escapeXml(pay.invoice.invoiceNumber)}</NAME>\n`;
          chunk += `                <BILLTYPE>Agst Ref</BILLTYPE>\n`;
          chunk += `                <AMOUNT>${payAmount}</AMOUNT>\n`;
          chunk += `              </BILLALLOCATIONS.LIST>\n`;
        }
        chunk += `            </ALLLEDGERENTRIES.LIST>\n`;
        chunk += `          </VOUCHER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      paySkip += BATCH_SIZE;
    }

    // 4. Export Credit Notes - Batched
    let cnSkip = 0;
    while (true) {
      const creditNotes = await this.prisma.creditNote.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: {
          customer: true,
          invoice: true,
          items: { include: { product: true } },
        },
        take: BATCH_SIZE,
        skip: cnSkip,
      });

      if (creditNotes.length === 0) break;

      for (const cn of creditNotes) {
        let chunk = '';
        const dateStr = cn.date.toISOString().split('T')[0].replace(/-/g, '');
        const partyName = this.escapeXml(
          cn.customer?.company || cn.customer?.firstName || 'Customer',
        );
        const refNo = this.escapeXml(cn.noteNumber);

        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <VOUCHER VCHTYPE="Credit Note" ACTION="Create">\n`;
        chunk += `            <DATE>${dateStr}</DATE>\n`;
        chunk += `            <VOUCHERNUMBER>${refNo}</VOUCHERNUMBER>\n`;
        chunk += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;

        // Cr Customer
        chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
        chunk += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
        chunk += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        chunk += `              <AMOUNT>${cn.totalAmount}</AMOUNT>\n`;
        if (cn.invoice) {
          chunk += `              <BILLALLOCATIONS.LIST>\n`;
          chunk += `                <NAME>${this.escapeXml(cn.invoice.invoiceNumber)}</NAME>\n`;
          chunk += `                <BILLTYPE>Agst Ref</BILLTYPE>\n`;
          chunk += `                <AMOUNT>${cn.totalAmount}</AMOUNT>\n`;
          chunk += `              </BILLALLOCATIONS.LIST>\n`;
        }
        chunk += `            </ALLLEDGERENTRIES.LIST>\n`;

        // Dr Sales Returns / Inventory
        for (const item of cn.items) {
          chunk += `            <INVENTORYENTRIES.LIST>\n`;
          chunk += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
          chunk += `              <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n`;
          chunk += `              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
          chunk += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.SALES_RETURNS)}</LEDGERNAME>\n`;
          chunk += `                <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
          chunk += `                <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `            </INVENTORYENTRIES.LIST>\n`;
        }

        // Dr Tax (Reversal)
        const cnAny = cn as any;
        if (cnAny.totalIGST && new Decimal(cnAny.totalIGST).gt(0)) {
          chunk += this.generateTaxLedger(
            StandardAccounts.OUTPUT_IGST,
            cnAny.totalIGST,
            false,
          );
        } else {
          if (cnAny.totalCGST && new Decimal(cnAny.totalCGST).gt(0))
            chunk += this.generateTaxLedger(
              StandardAccounts.OUTPUT_CGST,
              cnAny.totalCGST,
              false,
            );
          if (cnAny.totalSGST && new Decimal(cnAny.totalSGST).gt(0))
            chunk += this.generateTaxLedger(
              StandardAccounts.OUTPUT_SGST,
              cnAny.totalSGST,
              false,
            );
        }

        chunk += `          </VOUCHER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      cnSkip += BATCH_SIZE;
    }

    // 5. Export Debit Notes (Purchase Returns) - Batched
    let dnSkip = 0;
    while (true) {
      const debitNotes = await this.prisma.debitNote.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: {
          supplier: true,
          purchaseOrder: true,
          items: { include: { product: true } },
        },
        take: BATCH_SIZE,
        skip: dnSkip,
      });

      if (debitNotes.length === 0) break;

      for (const dn of debitNotes) {
        let chunk = '';
        const dateStr = dn.date.toISOString().split('T')[0].replace(/-/g, '');
        const partyName = this.escapeXml(dn.supplier?.name || 'Supplier');
        const refNo = this.escapeXml(dn.noteNumber);

        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <VOUCHER VCHTYPE="Debit Note" ACTION="Create">\n`;
        chunk += `            <DATE>${dateStr}</DATE>\n`;
        chunk += `            <VOUCHERNUMBER>${refNo}</VOUCHERNUMBER>\n`;
        chunk += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
        // Dr Supplier
        chunk += `            <ALLLEDGERENTRIES.LIST>\n`;
        chunk += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
        chunk += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        chunk += `              <AMOUNT>-${dn.totalAmount}</AMOUNT>\n`;
        if (dn.purchaseOrder) {
          chunk += `              <BILLALLOCATIONS.LIST>\n`;
          chunk += `                <NAME>${this.escapeXml(dn.purchaseOrder.orderNumber)}</NAME>\n`;
          chunk += `                <BILLTYPE>Agst Ref</BILLTYPE>\n`;
          chunk += `                <AMOUNT>-${dn.totalAmount}</AMOUNT>\n`;
          chunk += `              </BILLALLOCATIONS.LIST>\n`;
        }
        chunk += `            </ALLLEDGERENTRIES.LIST>\n`;

        // Cr Purchase Returns / Inventory
        for (const item of dn.items) {
          chunk += `            <INVENTORYENTRIES.LIST>\n`;
          chunk += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
          chunk += `              <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
          chunk += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.PURCHASE_RETURNS)}</LEDGERNAME>\n`;
          chunk += `                <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
          chunk += `                <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
          chunk += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
          chunk += `            </INVENTORYENTRIES.LIST>\n`;
        }

        // Cr Tax (Reversal)
        const dnAny = dn as any;
        if (dnAny.totalIGST && new Decimal(dnAny.totalIGST).gt(0)) {
          chunk += this.generateTaxLedger(
            StandardAccounts.INPUT_IGST,
            dnAny.totalIGST,
            true,
          );
        } else {
          if (dnAny.totalCGST && new Decimal(dnAny.totalCGST).gt(0))
            chunk += this.generateTaxLedger(
              StandardAccounts.INPUT_CGST,
              dnAny.totalCGST,
              true,
            );
          if (dnAny.totalSGST && new Decimal(dnAny.totalSGST).gt(0))
            chunk += this.generateTaxLedger(
              StandardAccounts.INPUT_SGST,
              dnAny.totalSGST,
              true,
            );
        }

        chunk += `          </VOUCHER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      dnSkip += BATCH_SIZE;
    }

    // 6. Export Manufacturing Stock Journals (Work Orders)
    let woSkip = 0;
    while (true) {
      const workOrders = await this.prisma.workOrder.findMany({
        where: {
          tenantId,
          endDate: { gte: startDate, lte: endDate },
          status: 'Completed',
        },
        include: {
          bom: {
            include: { product: true, items: { include: { product: true } } },
          },
        },
        take: BATCH_SIZE,
        skip: woSkip,
      });

      if (workOrders.length === 0) break;

      for (const wo of workOrders) {
        let chunk = '';
        const dateStr = wo
          .endDate!.toISOString()
          .split('T')[0]
          .replace(/-/g, '');
        const guid = `WO-${wo.id}`;
        const vchNo = wo.orderNumber;

        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <VOUCHER VCHTYPE="Stock Journal" ACTION="Create" OBJVIEW="InventoryVchView">\n`;
        chunk += `            <DATE>${dateStr}</DATE>\n`;
        chunk += `            <VOUCHERNUMBER>${this.escapeXml(vchNo)}</VOUCHERNUMBER>\n`;
        chunk += `            <PERSISTEDVIEW>InventoryVchView</PERSISTEDVIEW>\n`;
        chunk += `            <GUID>${guid}</GUID>\n`;

        // PRODUCTION (Finished Goods)
        chunk += `            <INVENTORYENTRIES.LIST>\n`;
        chunk += `              <STOCKITEMNAME>${this.escapeXml(wo.bom.product.name)}</STOCKITEMNAME>\n`;
        chunk += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        chunk += `              <HSNCODE>${this.escapeXml(wo.bom.product.hsnCode || '')}</HSNCODE>\n`;
        chunk += `              <RATE>${wo.bom.product.costPrice}</RATE>\n`;
        chunk += `              <AMOUNT>-${new Decimal(wo.producedQuantity as any).mul(new Decimal(wo.bom.product.costPrice as any)).toFixed(2)}</AMOUNT>\n`;
        chunk += `              <ACTUALQTY>${wo.producedQuantity} Nos</ACTUALQTY>\n`;
        chunk += `              <BILLEDQTY>${wo.producedQuantity} Nos</BILLEDQTY>\n`;
        chunk += `            </INVENTORYENTRIES.LIST>\n`;

        // CONSUMPTION (Raw Materials)
        for (const item of wo.bom.items) {
          const consumedQty = new Decimal(item.quantity as any).mul(
            new Decimal(wo.producedQuantity as any).add(
              new Decimal(wo.scrapQuantity as any),
            ),
          );
          chunk += `            <INVENTORYENTRIES.LIST>\n`;
          chunk += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
          chunk += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
          chunk += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
          chunk += `              <AMOUNT>${consumedQty.mul(new Decimal(item.product.costPrice as any)).toFixed(2)}</AMOUNT>\n`;
          chunk += `              <ACTUALQTY>${consumedQty} Nos</ACTUALQTY>\n              <BILLEDQTY>${consumedQty} Nos</BILLEDQTY>\n`;
          chunk += `            </INVENTORYENTRIES.LIST>\n`;
        }

        chunk += `          </VOUCHER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      woSkip += BATCH_SIZE;
    }

    yield `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
  }

  async exportTallyXml(tenantId: string, month?: number, year?: number) {
    const stream = this.generateTallyXmlStream(tenantId, month, year);
    // To support backward compatibility with tests waiting for a string
    // while letting controller utilize streams (via readable handling or converting back)
    // Actually, we can return the StreamableFile but let's just collect it if we need string.
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  }

  private generateTaxLedger(name: string, amount: any, isSales: boolean) {
    const sign = isSales ? '' : '-';
    const deemed = isSales ? 'NO' : 'YES';

    return (
      `            <ALLLEDGERENTRIES.LIST>\n` +
      `              <LEDGERNAME>${this.escapeXml(name)}</LEDGERNAME>\n` +
      `              <ISDEEMEDPOSITIVE>${deemed}</ISDEEMEDPOSITIVE>\n` +
      `              <AMOUNT>${sign}${amount}</AMOUNT>\n` +
      `            </ALLLEDGERENTRIES.LIST>\n`
    );
  }

  async getAuditorDashboard(tenantId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [lock, validation, inventory] = await Promise.all([
      (this.prisma as any).periodLock.findUnique({
        where: { tenantId_month_year: { tenantId, month, year } },
      }),
      this.validateTallyData(tenantId, month, year),
      this.prisma.product.findMany({
        where: { tenantId, stock: { lt: 0 }, isDeleted: false },
      }),
    ]);

    return {
      isLocked: lock?.isLocked || false,
      lockDetails: lock,
      status: validation.isValid ? 'CLEAN' : 'NEEDS_REVIEW',
      confidenceScore: validation.confidenceScore,
      hsnCoverage: validation.hsnCoverage || 0,
      summary: validation.summary,
      riskFlags: validation.riskFlags,
      errors: validation.errors,
      inventoryRisk: inventory.length > 0,
    };
  }

  async togglePeriodLock(
    tenantId: string,
    month: number,
    year: number,
    userId: string,
    action: 'LOCK' | 'UNLOCK',
    reason?: string,
  ) {
    const cacheKey = `period_lock_${tenantId}_${month}_${year}`;

    if (action === 'LOCK') {
      const validation = await this.validateTallyData(tenantId, month, year);
      if (!validation.isValid)
        throw new BadRequestException(
          'Cannot lock period with critical validation errors.',
        );

      const lock = await this.prisma.periodLock.upsert({
        where: { tenantId_month_year: { tenantId, month, year } },
        update: { isLocked: true, lockedAt: new Date(), lockedBy: userId },
        create: {
          tenantId,
          month,
          year,
          isLocked: true,
          lockedAt: new Date(),
          lockedBy: userId,
        },
      });

      // PERIOD-CACHE-001: Invalidate LedgerService cache
      await (this.ledger as any).cacheManager.del(cacheKey);
      return lock;
    } else {
      const lock = await this.prisma.periodLock.update({
        where: { tenantId_month_year: { tenantId, month, year } },
        data: { isLocked: false, reopenedAt: new Date(), reopenReason: reason },
      });

      // PERIOD-CACHE-001: Invalidate LedgerService cache
      await (this.ledger as any).cacheManager.del(cacheKey);
      return lock;
    }
  }
  async *generateLedgerMastersStream(tenantId: string) {
    yield `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    const BATCH_SIZE = 100;

    // Accounts
    let skip = 0;
    while (true) {
      const accounts = await this.prisma.account.findMany({
        where: { tenantId },
        skip,
        take: BATCH_SIZE,
        orderBy: { name: 'asc' },
      });
      if (accounts.length === 0) break;
      for (const acc of accounts) {
        let chunk = '';
        let tallyGroup = acc.type.toString();
        const escapedName = this.escapeXml(acc.name);
        if (acc.name === StandardAccounts.ACCOUNTS_RECEIVABLE)
          tallyGroup = 'Sundry Debtors';
        if (acc.name === StandardAccounts.ACCOUNTS_PAYABLE)
          tallyGroup = 'Sundry Creditors';
        if (acc.type === AccountType.Revenue) tallyGroup = 'Sales Accounts';
        if (acc.type === AccountType.Expense) tallyGroup = 'Direct Expenses';
        if (
          acc.name === StandardAccounts.BANK ||
          acc.name === StandardAccounts.CASH
        )
          tallyGroup = 'Cash-in-Hand';

        if (acc.name.includes('GST') || acc.name.includes('TDS'))
          tallyGroup = 'Duties & Taxes';
        if (
          acc.name.includes('Fixed Asset') ||
          acc.name === StandardAccounts.FIXED_ASSETS
        )
          tallyGroup = 'Fixed Assets';
        if (
          acc.name.includes('Inventory') ||
          acc.name.includes('Stock') ||
          acc.name === StandardAccounts.INVENTORY_ASSET
        )
          tallyGroup = 'Stock-in-Hand';

        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <LEDGER NAME="${escapedName}" ACTION="Create">\n`;
        chunk += `            <NAME.LIST>\n<NAME>${escapedName}</NAME>\n</NAME.LIST>\n`;
        chunk += `            <PARENT>${this.escapeXml(tallyGroup)}</PARENT>\n`;
        chunk += `            <OPENINGBALANCE>${acc.balance}</OPENINGBALANCE>\n`;
        chunk += `          </LEDGER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      skip += BATCH_SIZE;
    }

    // Customers
    skip = 0;
    while (true) {
      const customers = await this.prisma.customer.findMany({
        where: { tenantId, isDeleted: false },
        include: { openingBalances: true },
        skip,
        take: BATCH_SIZE,
      });
      if (customers.length === 0) break;
      for (const cust of customers) {
        let chunk = '';
        const escapedName = this.escapeXml(
          cust.company || `${cust.firstName} ${cust.lastName}`,
        );
        const ob = cust.openingBalances
          .reduce(
            (sum, b) => sum.add(new Decimal(b.amount as any)),
            new Decimal(0),
          )
          .toFixed(2);
        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <LEDGER NAME="${escapedName}" ACTION="Create">\n`;
        chunk += `            <NAME.LIST>\n<NAME>${escapedName}</NAME>\n</NAME.LIST>\n`;
        chunk += `            <PARENT>Sundry Debtors</PARENT>\n`;
        chunk += `            <OPENINGBALANCE>-${ob}</OPENINGBALANCE>\n`;
        chunk += `            <GSTREGISTRATIONTYPE>${cust.gstin ? 'Regular' : 'Unregistered'}</GSTREGISTRATIONTYPE>\n`;
        chunk += `            <LEDGERSTATENAME>${this.escapeXml(mapTallyState(cust.state))}</LEDGERSTATENAME>\n`;
        chunk += `            <STATENAME>${this.escapeXml(mapTallyState(cust.state))}</STATENAME>\n`;
        if (cust.gstin)
          chunk += `            <PARTYGSTIN>${this.escapeXml(cust.gstin)}</PARTYGSTIN>\n`;
        chunk += `          </LEDGER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      skip += BATCH_SIZE;
    }

    // Suppliers
    skip = 0;
    while (true) {
      const suppliers = await this.prisma.supplier.findMany({
        where: { tenantId, isDeleted: false },
        include: { openingBalances: true },
        skip,
        take: BATCH_SIZE,
      });
      if (suppliers.length === 0) break;
      for (const supp of suppliers) {
        let chunk = '';
        const escapedName = this.escapeXml(supp.name);
        const ob = supp.openingBalances
          .reduce(
            (sum, b) => sum.add(new Decimal(b.amount as any)),
            new Decimal(0),
          )
          .toFixed(2);
        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <LEDGER NAME="${escapedName}" ACTION="Create">\n`;
        chunk += `            <NAME.LIST>\n<NAME>${escapedName}</NAME>\n</NAME.LIST>\n`;
        chunk += `            <PARENT>Sundry Creditors</PARENT>\n`;
        chunk += `            <OPENINGBALANCE>${ob}</OPENINGBALANCE>\n`;
        chunk += `            <LEDGERSTATENAME>${this.escapeXml(mapTallyState(supp.state))}</LEDGERSTATENAME>\n`;
        chunk += `            <STATENAME>${this.escapeXml(mapTallyState(supp.state))}</STATENAME>\n`;
        if (supp.gstin)
          chunk += `            <PARTYGSTIN>${this.escapeXml(supp.gstin)}</PARTYGSTIN>\n`;
        chunk += `          </LEDGER>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      skip += BATCH_SIZE;
    }

    // Products
    skip = 0;
    while (true) {
      const products = await this.prisma.product.findMany({
        where: { tenantId, isDeleted: false },
        skip,
        take: BATCH_SIZE,
      });
      if (products.length === 0) break;
      for (const prod of products) {
        let chunk = '';
        chunk += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        chunk += `          <STOCKITEM NAME="${this.escapeXml(prod.name)}" ACTION="Create">\n`;
        chunk += `            <NAME.LIST>\n<NAME>${this.escapeXml(prod.name)}</NAME>\n</NAME.LIST>\n`;
        chunk += `            <BASEUNITS>Nos</BASEUNITS>\n`;
        chunk += `            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>\n`;
        chunk += `            <HSNCODE>${this.escapeXml(prod.hsnCode || '')}</HSNCODE>\n`;
        chunk += `            <OPENINGBALANCE>${prod.stock}</OPENINGBALANCE>\n`;
        chunk += `          </STOCKITEM>\n`;
        chunk += `        </TALLYMESSAGE>\n`;
        yield chunk;
      }
      skip += BATCH_SIZE;
    }

    yield `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
  }

  async exportLedgerMasters(tenantId: string) {
    const stream = this.generateLedgerMastersStream(tenantId);
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  }
}
