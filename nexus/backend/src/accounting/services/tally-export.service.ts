import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';

@Injectable()
export class TallyService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

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
          status: 'Received',
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

    const summary = {
      totalSales: 0,
      totalGST: 0,
      totalPurchases: 0,
      totalReceipts: 0,
      totalPayments: 0,
      netBalanceDr: 0,
      netBalanceCr: 0,
      status: 'PASS',
    };

    for (const inv of invoices) {
      const invNo = inv.invoiceNumber.trim();
      if (vchNumbers.has(invNo))
        errors.push(`BLOCKER: Duplicate Invoice Number found: ${invNo}`);
      vchNumbers.add(invNo);

      summary.totalSales += Number(inv.totalTaxable);
      summary.totalGST += Number(inv.totalGST);
      summary.netBalanceDr += Number(inv.totalAmount);

      const diff = Math.abs(
        Number(inv.totalAmount) -
          (Number(inv.totalTaxable) + Number(inv.totalGST)),
      );
      if (diff > 0.011) {
        errors.push(`BLOCKER: Imbalanced Voucher ${invNo}. Drift: ${diff.toFixed(2)}`);
      } else if (diff > 0) {
        warnings.push(`INFO: ${invNo} has a rounding adjustment of ${diff.toFixed(2)}`);
      }

      const isInterstate = inv.customer?.state?.toLowerCase() !== tenant?.state?.toLowerCase();
      if (isInterstate && Number(inv.totalIGST) === 0 && Number(inv.totalGST) > 0) {
        errors.push(`BLOCKER: Interstate Invoice ${invNo} missing IGST.`);
      }
      if (!isInterstate && Number(inv.totalIGST) > 0) {
        errors.push(`BLOCKER: Local Invoice ${invNo} should not have IGST.`);
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

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary,
      confidenceScore: Math.max(0, 100 - errors.length * 20 - warnings.length * 5),
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
      (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.amountPaid)),
      0,
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
      (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.amountPaid)),
      0,
    );

    return {
      receivable: this.ledger.round2(
        (Number(totalReceivable._sum.totalAmount) || 0) + partialAmount,
      ),
      overdueAmount: this.ledger.round2(overdueAmount),
      income: this.ledger.round2(Number(income._sum.balance) || 0),
      expenses: this.ledger.round2(Number(expenses._sum.balance) || 0),
      gstLiability: this.ledger.round2(Number(gstLiability._sum.totalGST) || 0),
      netProfit: this.ledger.round2(
        (Number(income._sum.balance) || 0) - (Number(expenses._sum.balance) || 0),
      ),
    };
  }

  async exportTallyXml(tenantId: string, month?: number, year?: number) {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const [tenant, invoices, payments] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.invoice.findMany({
        where: { tenantId, issueDate: { gte: startDate, lte: endDate }, status: { not: 'Cancelled' } },
        include: { customer: true, items: { include: { product: true } } },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
        include: { customer: true, supplier: true, invoice: true },
      }),
    ]);

    let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    // 1. Export Sales Invoices
    for (const inv of invoices) {
      const dateStr = inv.issueDate.toISOString().split('T')[0].replace(/-/g, '');
      const guid = `INV-${inv.id}`;
      
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="AccountingVchView">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${inv.customer?.company || inv.customer?.firstName || 'Cash Sales'}</PARTYLEDGERNAME>\n`;
      xml += `            <PERSISTEDVIEW>AccountingVchView</PERSISTEDVIEW>\n`;
      xml += `            <GUID>${guid}</GUID>\n`;

      // Ledger: Party (Debit)
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${inv.customer?.company || inv.customer?.firstName || 'Cash Sales'}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>-${inv.totalAmount}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      // Ledger: Sales (Credit)
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>Sales</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${inv.totalTaxable}</AMOUNT>\n`;
      
      // GST / HSN Inventory details could go here...
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      // Tax Ledgers
      if (inv.totalIGST.greaterThan(0)) {
        xml += this.generateTaxLedger('IGST Payable', inv.totalIGST);
      } else {
        if (inv.totalCGST.greaterThan(0)) xml += this.generateTaxLedger('CGST Payable', inv.totalCGST);
        if (inv.totalSGST.greaterThan(0)) xml += this.generateTaxLedger('SGST Payable', inv.totalSGST);
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 2. Export Payments (Receipts)
    for (const pay of payments) {
        if (!pay.customerId) continue; // Skip supplier payments for now
        const dateStr = pay.date.toISOString().split('T')[0].replace(/-/g, '');
        
        xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        xml += `          <VOUCHER VCHTYPE="Receipt" ACTION="Create">\n`;
        xml += `            <DATE>${dateStr}</DATE>\n`;
        xml += `            <VOUCHERNUMBER>${pay.reference || 'PAY-' + pay.id.substring(0,8)}</VOUCHERNUMBER>\n`;
        xml += `            <PARTYLEDGERNAME>${pay.customer?.company || pay.customer?.firstName || 'Customer'}</PARTYLEDGERNAME>\n`;
        
        // Dr Bank/Cash
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${pay.mode === 'Cash' ? 'Cash' : 'Bank'}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>-${pay.amount}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;

        // Cr Customer
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${pay.customer?.company || pay.customer?.firstName || 'Customer'}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${pay.amount}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
        
        xml += `          </VOUCHER>\n`;
        xml += `        </TALLYMESSAGE>\n`;
    }

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    return xml;
  }

  private generateTaxLedger(name: string, amount: any) {
    return `            <ALLLEDGERENTRIES.LIST>\n` +
           `              <LEDGERNAME>${name}</LEDGERNAME>\n` +
           `              <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n` +
           `              <AMOUNT>${amount}</AMOUNT>\n` +
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
      confidenceScore: validation.confidenceScore,
      summary: validation.summary,
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
    if (action === 'LOCK') {
      const validation = await this.validateTallyData(tenantId, month, year);
      if (!validation.isValid) {
        throw new BadRequestException('Cannot lock period with critical validation errors.');
      }

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
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    for (const acc of accounts) {
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <LEDGER NAME="${acc.name}" ACTION="Create">\n`;
      xml += `            <NAME.LIST>\n`;
      xml += `              <NAME>${acc.name}</NAME>\n`;
      xml += `            </NAME.LIST>\n`;
      xml += `            <PARENT>${acc.type}</PARENT>\n`; // Use AccountType as Group
      xml += `            <OPENINGBALANCE>${acc.balance}</OPENINGBALANCE>\n`;
      xml += `            <ISBILLWISEON>NO</ISBILLWISEON>\n`;
      xml += `          </LEDGER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    return xml;
  }
}
