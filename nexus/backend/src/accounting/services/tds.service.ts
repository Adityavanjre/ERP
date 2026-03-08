import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';
import { StandardAccounts } from '../constants/account-names';

export enum VendorType {
  Individual = 'Individual',
  Company = 'Company',
}

export interface TdsRule {
  id: string;
  section: string;
  rate: number;
  threshold: number;
  cumulativeThreshold?: number;
  applicableVendorType: VendorType;
  tenantId: string;
}

@Injectable()
export class TdsService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

  async getApplicableRule(
    tenantId: string,
    section: string,
    vendorType: VendorType,
  ): Promise<TdsRule | null> {
    return (this.prisma as any).tdsRule.findFirst({
      where: {
        tenantId,
        section,
        applicableVendorType: vendorType,
      },
    });
  }

  async calculateTds(
    tenantId: string,
    supplierId: string,
    section: string,
    billAmount: number,
  ): Promise<{
    tdsAmount: Decimal;
    netAmount: Decimal;
    ruleId?: string;
    isEscalated?: boolean;
  }> {
    const supplier = (await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    })) as any;

    if (!supplier) throw new BadRequestException('Supplier not found');

    const rule = await this.getApplicableRule(
      tenantId,
      section,
      supplier.vendorType as VendorType,
    );
    if (!rule) {
      return { tdsAmount: new Decimal(0), netAmount: new Decimal(billAmount) };
    }

    const currentBill = new Decimal(billAmount);
    const singleThreshold = new Decimal(rule.threshold);
    const cumulativeThreshold = rule.cumulativeThreshold
      ? new Decimal(rule.cumulativeThreshold)
      : null;

    // 1. Calculate cumulative amount for this financial year.
    //    COMP-002: Use tenant-configured fyStartMonth/fyStartDay instead of hardcoding April 1.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { fyStartMonth: true, fyStartDay: true },
    });
    const fyStartMonth = (tenant?.fyStartMonth ?? 4) - 1; // Prisma stores 1-based; JS months are 0-based
    const fyStartDay = tenant?.fyStartDay ?? 1;
    const now = new Date();
    // If current date is before the FY start in the current calendar year, the FY started last year
    const fyStartThisYear = new Date(
      now.getFullYear(),
      fyStartMonth,
      fyStartDay,
    );
    const currentYear =
      now < fyStartThisYear ? now.getFullYear() - 1 : now.getFullYear();
    const fyStart = new Date(currentYear, fyStartMonth, fyStartDay);

    const transactions = await (this.prisma as any).tdsTransaction.findMany({
      where: {
        tenantId,
        supplierId,
        ruleId: rule.id,
        date: { gte: fyStart },
      },
    });

    const totalPriorAmount = transactions.reduce(
      (sum: Decimal, t: any) => sum.add(new Decimal(t.amount)),
      new Decimal(0),
    );
    const totalWithCurrent = totalPriorAmount.add(currentBill);

    let tdsApplicable = false;

    // Rule: Applicable if single bill > threshold OR cumulative > cumulativeThreshold
    if (currentBill.greaterThan(singleThreshold)) {
      tdsApplicable = true;
    } else if (
      cumulativeThreshold &&
      totalWithCurrent.greaterThan(cumulativeThreshold)
    ) {
      tdsApplicable = true;
    }

    if (!tdsApplicable) {
      return {
        tdsAmount: new Decimal(0),
        netAmount: currentBill,
        ruleId: rule.id,
      };
    }

    // Calculation logic:
    // If it's the first time crossing the cumulative threshold, TDS applies to the WHOLE cumulative amount
    // (Indian law usually requires this for some sections like 194C)
    // For simplicity here, we apply to current bill if already crossed, or to whole amount if just crossing.

    let tdsAmount = new Decimal(0);

    // PAN-linked rate escalation (Section 206AA)
    const hasPan = !!supplier.pan && supplier.pan.length === 10;
    const baseRate = new Decimal(rule.rate);
    const effectiveRate = hasPan
      ? baseRate
      : Decimal.max(baseRate, new Decimal(20));
    const rate = effectiveRate.div(100);

    const totalPriorTds = transactions.reduce(
      (sum: Decimal, t: { tdsAmount: number | Decimal }) =>
        sum.add(new Decimal(t.tdsAmount)),
      new Decimal(0),
    );

    // Re-calculating total TDS due on cumulative amount
    const totalTdsDue = this.ledger.round2(totalWithCurrent.mul(rate));
    tdsAmount = totalTdsDue.sub(totalPriorTds);

    if (tdsAmount.lessThan(0)) tdsAmount = new Decimal(0);

    // If rate was escalated due to missing PAN, log it in details
    const isEscalated = !hasPan && effectiveRate.greaterThan(baseRate);

    return {
      tdsAmount,
      netAmount: currentBill.sub(tdsAmount),
      ruleId: rule.id,
      isEscalated,
    };
  }

  async recordTdsTransaction(
    tenantId: string,
    data: {
      ruleId: string;
      supplierId: string;
      amount: Decimal;
      tdsAmount: Decimal;
      paymentId?: string;
      purchaseOrderId?: string;
      journalEntryId?: string;
      date?: Date;
    },
    tx?: any,
  ) {
    const client = tx || this.prisma;
    return client.tdsTransaction.create({
      data: {
        ...data,
        tenantId,
        date: data.date || new Date(),
      },
    });
  }

  async getVendorWiseReport(tenantId: string) {
    const transactions = await this.prisma.tdsTransaction.findMany({
      where: { tenantId },
      include: { supplier: true, rule: true },
      orderBy: { date: 'desc' },
    });

    const report: Record<string, any> = {};
    for (const t of transactions) {
      const sid = t.supplierId;
      if (!report[sid]) {
        report[sid] = {
          supplier: t.supplier.name,
          pan: (t.supplier as any).pan || 'N/A',
          totalAmount: new Decimal(0),
          tdsAmount: new Decimal(0),
          transactions: [],
        };
      }
      report[sid].totalAmount = report[sid].totalAmount.add(t.amount);
      report[sid].tdsAmount = report[sid].tdsAmount.add(t.tdsAmount);
      report[sid].transactions.push(t);
    }
    return Object.values(report);
  }

  async getSectionWiseReport(tenantId: string) {
    const transactions = await this.prisma.tdsTransaction.findMany({
      where: { tenantId },
      include: { rule: true },
    });

    const report: Record<string, any> = {};
    for (const t of transactions) {
      const section = t.rule.section;
      if (!report[section]) {
        report[section] = {
          section,
          rate: t.rule.rate,
          totalAmount: new Decimal(0),
          tdsAmount: new Decimal(0),
        };
      }
      report[section].totalAmount = report[section].totalAmount.add(t.amount);
      report[section].tdsAmount = report[section].tdsAmount.add(t.tdsAmount);
    }
    return Object.values(report);
  }

  async getTdsPayableSummary(tenantId: string) {
    const tdsPayableAcc = await this.prisma.account.findFirst({
      where: { tenantId, name: StandardAccounts.TDS_PAYABLE },
    });

    return {
      accountName: StandardAccounts.TDS_PAYABLE,
      balance: tdsPayableAcc?.balance || 0,
    };
  }
}
