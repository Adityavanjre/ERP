import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, InvoiceStatus, POStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';
import { StandardAccounts } from '../constants/account-names';

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
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '"': return '&quot;';
          case "'": return '&apos;';
          default: return c;
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
        where: { tenantId, issueDate: { gte: startDate, lte: endDate }, status: { not: 'Cancelled' } },
        include: { customer: true, items: { include: { product: true } } },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { tenantId, orderDate: { gte: startDate, lte: endDate }, status: POStatus.Received },
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
    };

    for (const inv of invoices) {
      const invNo = inv.invoiceNumber.trim();
      if (vchNumbers.has(invNo)) errors.push(`BLOCKER: Duplicate Invoice Number: ${invNo}`);
      vchNumbers.add(invNo);

      summary.totalSales += Number(inv.totalTaxable);
      summary.totalGST += Number(inv.totalGST);
      summary.netBalanceDr += Number(inv.totalAmount);

      for (const item of inv.items) {
        totalItems++;
        if (item.product.hsnCode) hsnCoverage++;
        else warnings.push(`Invoice #${inv.invoiceNumber}: Product ${item.product.name} missing HSN Code.`);
      }

      // Balance Check
      const itemsSum = inv.items.reduce((s, i) => s.add(i.taxableAmount), new Decimal(0));
      const taxSum = inv.totalCGST.add(inv.totalSGST).add(inv.totalIGST);
      const diff = inv.totalAmount.minus(itemsSum.add(taxSum)).abs();
      if (diff.gt(0.011)) {
        errors.push(`BLOCKER: Imbalanced Voucher ${invNo}. Drift: ${diff.toFixed(2)}`);
      }
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
    const coverageScore = totalItems > 0 ? (hsnCoverage / totalItems) * 100 : 100;

    const riskFlags = [];
    const negStock = await this.prisma.product.count({ where: { tenantId, stock: { lt: 0 }, isDeleted: false } });
    if (negStock > 0) riskFlags.push({ type: 'NEGATIVE_STOCK', count: negStock, severity: 'BLOCKER' });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary,
      riskFlags,
      hsnCoverage: coverageScore,
      confidenceScore: Math.max(0, 100 - (errors.length * 15) - (riskFlags.filter(f => f.severity === 'BLOCKER').length * 25)),
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
      (sum, inv) => sum.add(new Decimal(inv.totalAmount).sub(new Decimal(inv.amountPaid))),
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
      (sum, inv) => sum.add(new Decimal(inv.totalAmount).sub(new Decimal(inv.amountPaid))),
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

  async exportTallyXml(tenantId: string, month?: number, year?: number) {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const [tenant, invoices, payments, purchases, creditNotes, debitNotes, fixedAssets, depreciationLogs, journalEntries] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.invoice.findMany({
        where: { tenantId, issueDate: { gte: startDate, lte: endDate }, status: { not: 'Cancelled' } },
        include: { customer: true, items: { include: { product: true } } },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: { customer: true, supplier: true, invoice: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { tenantId, orderDate: { gte: startDate, lte: endDate }, status: POStatus.Received },
        include: { supplier: true, items: { include: { product: true } } },
      }),
      this.prisma.creditNote.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: { customer: true, invoice: true, items: { include: { product: true } } },
      }),
      this.prisma.debitNote.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: { supplier: true, purchaseOrder: true, items: { include: { product: true } } },
      }),
      (this.prisma as any).fixedAsset.findMany({
        where: { tenantId, purchaseDate: { gte: startDate, lte: endDate } },
      }),
      (this.prisma as any).depreciationLog.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: { asset: true },
      }),
      this.prisma.journalEntry.findMany({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          // Audit Rule: Don't double-export journals that are automatically created by Invoices/Payments
          invoice: null,
          creditNote: null,
          debitNote: null,
        },
        include: { transactions: { include: { account: true } } },
      }),
    ]);

    let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    // 1. Export Sales Invoices
    for (const inv of invoices) {
      const dateStr = inv.issueDate.toISOString().split('T')[0].replace(/-/g, '');
      const guid = `INV-${inv.id}`;
      const partyName = this.escapeXml(inv.customer?.company || inv.customer?.firstName || 'Cash Sales');

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="AccountingVchView">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${this.escapeXml(inv.invoiceNumber)}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
      xml += `            <PERSISTEDVIEW>AccountingVchView</PERSISTEDVIEW>\n`;
      xml += `            <GUID>${guid}</GUID>\n`;

      // Dr Customer
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>-${inv.totalAmount}</AMOUNT>\n`;
      xml += `              <BILLALLOCATIONS.LIST>\n`;
      xml += `                <NAME>${this.escapeXml(inv.invoiceNumber)}</NAME>\n`;
      xml += `                <BILLTYPE>New Ref</BILLTYPE>\n`;
      xml += `                <AMOUNT>-${inv.totalAmount}</AMOUNT>\n`;
      xml += `              </BILLALLOCATIONS.LIST>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      // Cr Inventory per item
      for (const item of inv.items) {
        xml += `            <INVENTORYENTRIES.LIST>\n`;
        xml += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
        xml += `              <RATE>${item.unitPrice}</RATE>\n`;
        xml += `              <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
        xml += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n`;
        xml += `              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
        xml += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.SALES)}</LEDGERNAME>\n`;
        xml += `                <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `                <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
        xml += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `            </INVENTORYENTRIES.LIST>\n`;
      }

      // Tax Ledgers
      let taxSum = new Decimal(0);
      if (inv.totalIGST.greaterThan(0)) {
        xml += this.generateTaxLedger(StandardAccounts.OUTPUT_IGST, inv.totalIGST, true);
        taxSum = taxSum.add(inv.totalIGST);
      } else {
        if (inv.totalCGST.greaterThan(0)) {
          xml += this.generateTaxLedger(StandardAccounts.OUTPUT_CGST, inv.totalCGST, true);
          taxSum = taxSum.add(inv.totalCGST);
        }
        if (inv.totalSGST.greaterThan(0)) {
          xml += this.generateTaxLedger(StandardAccounts.OUTPUT_SGST, inv.totalSGST, true);
          taxSum = taxSum.add(inv.totalSGST);
        }
      }

      // Rounding Ledger
      const totalItemsAndTax = inv.items.reduce((sum, item) => sum.add(item.taxableAmount), new Decimal(0)).add(taxSum);
      const diff = inv.totalAmount.minus(totalItemsAndTax);
      if (diff.abs().greaterThan(0)) {
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${this.escapeXml(StandardAccounts.ROUNDING_OFF)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>${diff.isPositive() ? 'NO' : 'YES'}</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${diff.isPositive() ? diff.abs() : diff.abs().negated()}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 2. Export Purchase Invoices (Received POs)
    for (const po of purchases) {
      const dateStr = po.orderDate.toISOString().split('T')[0].replace(/-/g, '');
      const guid = `PUR-${po.id}`;
      const partyName = this.escapeXml(po.supplier?.name || 'Supplier');

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Purchases" ACTION="Create" OBJVIEW="AccountingVchView">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${this.escapeXml(po.orderNumber)}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
      xml += `            <PERSISTEDVIEW>AccountingVchView</PERSISTEDVIEW>\n`;
      xml += `            <GUID>${guid}</GUID>\n`;

      // Cr Supplier (Net)
      const netAmount = (po as any).netAmount || po.totalAmount;
      const tdsAmount = (po as any).tdsAmount || 0;

      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${netAmount}</AMOUNT>\n`;
      xml += `              <BILLALLOCATIONS.LIST>\n`;
      xml += `                <NAME>${this.escapeXml(po.orderNumber)}</NAME>\n`;
      xml += `                <BILLTYPE>New Ref</BILLTYPE>\n`;
      xml += `                <AMOUNT>${netAmount}</AMOUNT>\n`;
      xml += `              </BILLALLOCATIONS.LIST>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      // TDS Entry
      if (new Decimal(tdsAmount).gt(0)) {
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${this.escapeXml(StandardAccounts.TDS_PAYABLE)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${tdsAmount}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      }

      // Dr Inventory per item
      for (const item of po.items) {
        xml += `            <INVENTORYENTRIES.LIST>\n`;
        xml += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        xml += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
        xml += `              <RATE>${item.unitPrice}</RATE>\n`;
        xml += `              <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
        xml += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n`;
        xml += `              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
        xml += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.INVENTORY_ASSET)}</LEDGERNAME>\n`;
        xml += `                <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        xml += `                <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
        xml += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `            </INVENTORYENTRIES.LIST>\n`;
      }

      // Tax Ledgers (Input GST)
      if (po.totalIGST.greaterThan(0)) {
        xml += this.generateTaxLedger(StandardAccounts.INPUT_IGST, po.totalIGST, false);
      } else {
        if (po.totalCGST.greaterThan(0)) xml += this.generateTaxLedger(StandardAccounts.INPUT_CGST, po.totalCGST, false);
        if (po.totalSGST.greaterThan(0)) xml += this.generateTaxLedger(StandardAccounts.INPUT_SGST, po.totalSGST, false);
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 3. Export Payments & Receipts
    for (const pay of payments) {
      const isReceipt = !!pay.customerId;
      const dateStr = pay.date.toISOString().split('T')[0].replace(/-/g, '');
      const partyName = isReceipt
        ? this.escapeXml(pay.customer?.company || pay.customer?.firstName || 'Customer')
        : this.escapeXml(pay.supplier?.name || 'Supplier');
      const refNo = this.escapeXml(pay.reference || (isReceipt ? 'RECT-' : 'PAY-') + pay.id.substring(0, 8));
      const vchType = isReceipt ? 'Receipt' : 'Payment';

      const payAmount = new Decimal(pay.amount);
      const tdsAmount = new Decimal((pay as any).tdsAmount || 0);
      const netAmount = payAmount.sub(tdsAmount);

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="${vchType}" ACTION="Create">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${refNo}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;

      // Bank/Cash entry (Net)
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${this.escapeXml(pay.mode === 'Cash' ? StandardAccounts.CASH : StandardAccounts.BANK)}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>${isReceipt ? 'YES' : 'NO'}</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${isReceipt ? '-' : ''}${netAmount}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      // TDS Entry
      if (tdsAmount.gt(0)) {
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${this.escapeXml(StandardAccounts.TDS_PAYABLE)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${tdsAmount}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      }

      // Party entry (Gross)
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>${isReceipt ? 'NO' : 'YES'}</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${isReceipt ? '' : '-'}${payAmount}</AMOUNT>\n`;
      if (pay.invoice) {
        xml += `              <BILLALLOCATIONS.LIST>\n`;
        xml += `                <NAME>${this.escapeXml(pay.invoice.invoiceNumber)}</NAME>\n`;
        xml += `                <BILLTYPE>Agst Ref</BILLTYPE>\n`;
        xml += `                <AMOUNT>${payAmount}</AMOUNT>\n`;
        xml += `              </BILLALLOCATIONS.LIST>\n`;
      }
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 4. Export Credit Notes (Sales Returns)
    for (const cn of creditNotes) {
      const dateStr = cn.date.toISOString().split('T')[0].replace(/-/g, '');
      const partyName = this.escapeXml(cn.customer?.company || cn.customer?.firstName || 'Customer');
      const refNo = this.escapeXml(cn.noteNumber);

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Credit Note" ACTION="Create">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${refNo}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;

      // Cr Customer
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${cn.totalAmount}</AMOUNT>\n`;
      if (cn.invoice) {
        xml += `              <BILLALLOCATIONS.LIST>\n`;
        xml += `                <NAME>${this.escapeXml(cn.invoice.invoiceNumber)}</NAME>\n`;
        xml += `                <BILLTYPE>Agst Ref</BILLTYPE>\n`;
        xml += `                <AMOUNT>${cn.totalAmount}</AMOUNT>\n`;
        xml += `              </BILLALLOCATIONS.LIST>\n`;
      }
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      // Dr Sales Returns / Inventory
      for (const item of cn.items) {
        xml += `            <INVENTORYENTRIES.LIST>\n`;
        xml += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        xml += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
        xml += `              <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
        xml += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n`;
        xml += `              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
        xml += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.SALES_RETURNS)}</LEDGERNAME>\n`;
        xml += `                <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        xml += `                <AMOUNT>-${item.taxableAmount}</AMOUNT>\n`;
        xml += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `            </INVENTORYENTRIES.LIST>\n`;
      }

      // Dr Tax (Reversal)
      const cnAny = cn as any;
      if (cnAny.totalIGST && new Decimal(cnAny.totalIGST).gt(0)) {
        xml += this.generateTaxLedger(StandardAccounts.OUTPUT_IGST, cnAny.totalIGST, false);
      } else {
        if (cnAny.totalCGST && new Decimal(cnAny.totalCGST).gt(0)) xml += this.generateTaxLedger(StandardAccounts.OUTPUT_CGST, cnAny.totalCGST, false);
        if (cnAny.totalSGST && new Decimal(cnAny.totalSGST).gt(0)) xml += this.generateTaxLedger(StandardAccounts.OUTPUT_SGST, cnAny.totalSGST, false);
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 5. Export Debit Notes (Purchase Returns)
    for (const dn of debitNotes) {
      const dateStr = dn.date.toISOString().split('T')[0].replace(/-/g, '');
      const partyName = this.escapeXml(dn.supplier?.name || 'Supplier');
      const refNo = this.escapeXml(dn.noteNumber);

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Debit Note" ACTION="Create">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${refNo}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
      // Dr Supplier
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>-${dn.totalAmount}</AMOUNT>\n`;
      if (dn.purchaseOrder) {
        xml += `              <BILLALLOCATIONS.LIST>\n`;
        xml += `                <NAME>${this.escapeXml(dn.purchaseOrder.orderNumber)}</NAME>\n`;
        xml += `                <BILLTYPE>Agst Ref</BILLTYPE>\n`;
        xml += `                <AMOUNT>-${dn.totalAmount}</AMOUNT>\n`;
        xml += `              </BILLALLOCATIONS.LIST>\n`;
      }
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      // Cr Purchase Returns / Inventory
      for (const item of dn.items) {
        xml += `            <INVENTORYENTRIES.LIST>\n`;
        xml += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
        xml += `              <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
        xml += `              <ACTUALQTY>${item.quantity} Nos</ACTUALQTY>\n              <BILLEDQTY>${item.quantity} Nos</BILLEDQTY>\n`;
        xml += `              <ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `                <LEDGERNAME>${this.escapeXml(StandardAccounts.PURCHASE_RETURNS)}</LEDGERNAME>\n`;
        xml += `                <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `                <AMOUNT>${item.taxableAmount}</AMOUNT>\n`;
        xml += `              </ACCOUNTINGLEDGERENTRIES.LIST>\n`;
        xml += `            </INVENTORYENTRIES.LIST>\n`;
      }

      // Cr Tax (Reversal)
      const dnAny = dn as any;
      if (dnAny.totalIGST && new Decimal(dnAny.totalIGST).gt(0)) {
        xml += this.generateTaxLedger(StandardAccounts.INPUT_IGST, dnAny.totalIGST, true);
      } else {
        if (dnAny.totalCGST && new Decimal(dnAny.totalCGST).gt(0)) xml += this.generateTaxLedger(StandardAccounts.INPUT_CGST, dnAny.totalCGST, true);
        if (dnAny.totalSGST && new Decimal(dnAny.totalSGST).gt(0)) xml += this.generateTaxLedger(StandardAccounts.INPUT_SGST, dnAny.totalSGST, true);
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 6. Export Manufacturing Stock Journals (Work Orders)
    const workOrders = await this.prisma.workOrder.findMany({
      where: { tenantId, endDate: { gte: startDate, lte: endDate }, status: 'Completed' },
      include: { bom: { include: { product: true, items: { include: { product: true } } } } },
    });

    for (const wo of workOrders) {
      const dateStr = wo.endDate!.toISOString().split('T')[0].replace(/-/g, '');
      const guid = `WO-${wo.id}`;
      const vchNo = wo.orderNumber;

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Stock Journal" ACTION="Create" OBJVIEW="InventoryVchView">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${this.escapeXml(vchNo)}</VOUCHERNUMBER>\n`;
      xml += `            <PERSISTEDVIEW>InventoryVchView</PERSISTEDVIEW>\n`;
      xml += `            <GUID>${guid}</GUID>\n`;

      // PRODUCTION (Finished Goods)
      xml += `            <INVENTORYENTRIES.LIST>\n`;
      xml += `              <STOCKITEMNAME>${this.escapeXml(wo.bom.product.name)}</STOCKITEMNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
      xml += `              <HSNCODE>${this.escapeXml(wo.bom.product.hsnCode || '')}</HSNCODE>\n`;
      xml += `              <RATE>${wo.bom.product.costPrice}</RATE>\n`;
      xml += `              <AMOUNT>-${Number(wo.producedQuantity) * Number(wo.bom.product.costPrice)}</AMOUNT>\n`;
      xml += `              <ACTUALQTY>${wo.producedQuantity} Nos</ACTUALQTY>\n`;
      xml += `              <BILLEDQTY>${wo.producedQuantity} Nos</BILLEDQTY>\n`;
      xml += `            </INVENTORYENTRIES.LIST>\n`;

      // CONSUMPTION (Raw Materials)
      for (const item of wo.bom.items) {
        const consumedQty = Number(item.quantity) * (Number(wo.producedQuantity) + Number(wo.scrapQuantity));
        xml += `            <INVENTORYENTRIES.LIST>\n`;
        xml += `              <STOCKITEMNAME>${this.escapeXml(item.product.name)}</STOCKITEMNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `              <HSNCODE>${this.escapeXml(item.product.hsnCode || '')}</HSNCODE>\n`;
        xml += `              <AMOUNT>${consumedQty * Number(item.product.costPrice)}</AMOUNT>\n`;
        xml += `              <ACTUALQTY>${consumedQty} Nos</ACTUALQTY>\n              <BILLEDQTY>${consumedQty} Nos</BILLEDQTY>\n`;
        xml += `            </INVENTORYENTRIES.LIST>\n`;
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 7. Fixed Assets
    for (const asset of (fixedAssets as any[])) {
      const dateStr = asset.purchaseDate.toISOString().split('T')[0].replace(/-/g, '');
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n` +
        `          <VOUCHER VCHTYPE="Journal" ACTION="Create">\n` +
        `            <DATE>${dateStr}</DATE>\n` +
        `            <VOUCHERNUMBER>${this.escapeXml(asset.assetCode)}</VOUCHERNUMBER>\n` +
        `            <ALLLEDGERENTRIES.LIST>\n` +
        `              <LEDGERNAME>${this.escapeXml(StandardAccounts.FIXED_ASSETS)}</LEDGERNAME>\n` +
        `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n` +
        `              <AMOUNT>-${asset.purchaseValue}</AMOUNT>\n` +
        `            </ALLLEDGERENTRIES.LIST>\n` +
        `            <ALLLEDGERENTRIES.LIST>\n` +
        `              <LEDGERNAME>${this.escapeXml(StandardAccounts.BANK)}</LEDGERNAME>\n` +
        `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n` +
        `              <AMOUNT>${asset.purchaseValue}</AMOUNT>\n` +
        `            </ALLLEDGERENTRIES.LIST>\n` +
        `          </VOUCHER>\n` +
        `        </TALLYMESSAGE>\n`;
    }

    // 8. Depreciation
    for (const log of (depreciationLogs as any[])) {
      const dateStr = log.date.toISOString().split('T')[0].replace(/-/g, '');
      xml += `        <TALLYMESSAGE xmlns:UDF="TALLYUDF">\n` +
        `          <VOUCHER VCHTYPE="Journal" ACTION="Create">\n` +
        `            <DATE>${dateStr}</DATE>\n` +
        `            <VOUCHERNUMBER>${this.escapeXml(`DEP-${log.asset.assetCode}-${dateStr}`)}</VOUCHERNUMBER>\n` +
        `            <ALLLEDGERENTRIES.LIST>\n` +
        `              <LEDGERNAME>${this.escapeXml(StandardAccounts.DEPRECIATION_EXPENSE)}</LEDGERNAME>\n` +
        `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n` +
        `              <AMOUNT>-${log.amount}</AMOUNT>\n` +
        `            </ALLLEDGERENTRIES.LIST>\n` +
        `            <ALLLEDGERENTRIES.LIST>\n` +
        `              <LEDGERNAME>${this.escapeXml(StandardAccounts.ACCUMULATED_DEPRECIATION)}</LEDGERNAME>\n` +
        `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n` +
        `              <AMOUNT>${log.amount}</AMOUNT>\n` +
        `            </ALLLEDGERENTRIES.LIST>\n` +
        `          </VOUCHER>\n` +
        `        </TALLYMESSAGE>\n`;
    }

    // 9. Manual Journal Entries (The final piece of the audit puzzle)
    for (const j of (journalEntries as any[])) {
      const dateStr = j.date.toISOString().split('T')[0].replace(/-/g, '');
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Journal" ACTION="Create">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${this.escapeXml(j.reference || `JV-${j.id.slice(0, 8)}`)}</VOUCHERNUMBER>\n`;
      xml += `            <NARRATION>${this.escapeXml(j.description)}</NARRATION>\n`;

      for (const t of j.transactions) {
        const isDebit = t.type === 'Debit';
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${this.escapeXml(t.account.name)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>${isDebit ? 'YES' : 'NO'}</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${isDebit ? '-' : ''}${t.amount}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    return xml;
  }

  private generateTaxLedger(name: string, amount: any, isSales: boolean) {
    const sign = isSales ? '' : '-';
    const deemed = isSales ? 'NO' : 'YES';

    return `            <ALLLEDGERENTRIES.LIST>\n` +
      `              <LEDGERNAME>${this.escapeXml(name)}</LEDGERNAME>\n` +
      `              <ISDEEMEDPOSITIVE>${deemed}</ISDEEMEDPOSITIVE>\n` +
      `              <AMOUNT>${sign}${amount}</AMOUNT>\n` +
      `            </ALLLEDGERENTRIES.LIST>\n`;
  }

  async getAuditorDashboard(tenantId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [lock, validation, auditLogs, inventory] = await Promise.all([
      (this.prisma as any).periodLock.findUnique({
        where: { tenantId_month_year: { tenantId, month, year } },
      }),
      this.validateTallyData(tenantId, month, year),
      this.prisma.auditLog.findMany({
        where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.product.findMany({ where: { tenantId, stock: { lt: 0 }, isDeleted: false } }),
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

  async togglePeriodLock(tenantId: string, month: number, year: number, userId: string, action: 'LOCK' | 'UNLOCK', reason?: string) {
    if (action === 'LOCK') {
      const validation = await this.validateTallyData(tenantId, month, year);
      if (!validation.isValid) throw new BadRequestException('Cannot lock period with critical validation errors.');

      return (this.prisma as any).periodLock.upsert({
        where: { tenantId_month_year: { tenantId, month, year } },
        update: { isLocked: true, lockedAt: new Date(), lockedBy: userId },
        create: { tenantId, month, year, isLocked: true, lockedAt: new Date(), lockedBy: userId },
      });
    } else {
      return (this.prisma as any).periodLock.update({
        where: { tenantId_month_year: { tenantId, month, year } },
        data: { isLocked: false, reopenedAt: new Date(), reopenReason: reason },
      });
    }
  }

  async exportLedgerMasters(tenantId: string) {
    const [accounts, customers, suppliers, products] = await Promise.all([
      this.prisma.account.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
      this.prisma.customer.findMany({ where: { tenantId, isDeleted: false }, include: { openingBalances: true } }),
      this.prisma.supplier.findMany({ where: { tenantId, isDeleted: false }, include: { openingBalances: true } }),
      this.prisma.product.findMany({ where: { tenantId, isDeleted: false } }),
    ]);

    let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    for (const acc of accounts) {
      let tallyGroup = acc.type.toString();
      const escapedName = this.escapeXml(acc.name);
      if (acc.name === StandardAccounts.ACCOUNTS_RECEIVABLE) tallyGroup = 'Sundry Debtors';
      if (acc.name === StandardAccounts.ACCOUNTS_PAYABLE) tallyGroup = 'Sundry Creditors';
      if (acc.type === AccountType.Revenue) tallyGroup = 'Sales Accounts';
      if (acc.type === AccountType.Expense) tallyGroup = 'Direct Expenses';
      if (acc.name === StandardAccounts.BANK || acc.name === StandardAccounts.CASH) tallyGroup = 'Cash-in-Hand';

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <LEDGER NAME="${escapedName}" ACTION="Create">\n`;
      xml += `            <NAME.LIST>\n<NAME>${escapedName}</NAME>\n</NAME.LIST>\n`;
      xml += `            <PARENT>${this.escapeXml(tallyGroup)}</PARENT>\n`;
      xml += `            <OPENINGBALANCE>${acc.balance}</OPENINGBALANCE>\n`;
      xml += `          </LEDGER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    for (const cust of customers) {
      const escapedName = this.escapeXml(cust.company || `${cust.firstName} ${cust.lastName}`);
      const ob = cust.openingBalances.reduce((sum, b) => sum + Number(b.amount), 0);
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <LEDGER NAME="${escapedName}" ACTION="Create">\n`;
      xml += `            <NAME.LIST>\n<NAME>${escapedName}</NAME>\n</NAME.LIST>\n`;
      xml += `            <PARENT>Sundry Debtors</PARENT>\n`;
      xml += `            <OPENINGBALANCE>-${ob}</OPENINGBALANCE>\n`;
      xml += `            <GSTREGISTRATIONTYPE>${cust.gstin ? 'Regular' : 'Unregistered'}</GSTREGISTRATIONTYPE>\n`;
      if (cust.gstin) xml += `            <PARTYGSTIN>${this.escapeXml(cust.gstin)}</PARTYGSTIN>\n`;
      xml += `          </LEDGER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    for (const supp of suppliers) {
      const escapedName = this.escapeXml(supp.name);
      const ob = supp.openingBalances.reduce((sum, b) => sum + Number(b.amount), 0);
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <LEDGER NAME="${escapedName}" ACTION="Create">\n`;
      xml += `            <NAME.LIST>\n<NAME>${escapedName}</NAME>\n</NAME.LIST>\n`;
      xml += `            <PARENT>Sundry Creditors</PARENT>\n`;
      xml += `            <OPENINGBALANCE>${ob}</OPENINGBALANCE>\n`;
      if (supp.gstin) xml += `            <PARTYGSTIN>${this.escapeXml(supp.gstin)}</PARTYGSTIN>\n`;
      xml += `          </LEDGER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    for (const prod of products) {
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <STOCKITEM NAME="${this.escapeXml(prod.name)}" ACTION="Create">\n`;
      xml += `            <NAME.LIST>\n<NAME>${this.escapeXml(prod.name)}</NAME>\n</NAME.LIST>\n`;
      xml += `            <BASEUNITS>Nos</BASEUNITS>\n`;
      xml += `            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>\n`;
      xml += `            <HSNCODE>${this.escapeXml(prod.hsnCode || '')}</HSNCODE>\n`;
      xml += `            <OPENINGBALANCE>${prod.stock}</OPENINGBALANCE>\n`;
      xml += `          </STOCKITEM>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    return xml;
  }
}
