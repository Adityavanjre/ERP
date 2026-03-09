import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TraceService } from '../common/services/trace.service';

@Injectable()
export class NbfcService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private traceService: TraceService,
  ) { }

  // --- Loan Management System ---
  async addInterestSlabs(
    tenantId: string,
    loanId: string,
    slabs: { thresholdAmount: number; interestRate: number }[],
  ) {
    return this.prisma.loanInterestSlab.createMany({
      data: slabs.map((s) => ({ ...s, tenantId, loanId })),
    });
  }

  async applyForLoan(tenantId: string, data: any) {
    return this.prisma.loan.create({
      data: {
        tenantId,
        borrowerId: data.borrowerId,
        loanAmount: data.loanAmount,
        interestRate: data.interestRate,
        tenureMonths: data.tenureMonths,
        startDate: new Date(data.startDate),
        status: 'Applied',
        correlationId: this.traceService.getCorrelationId(), // Forensic Trace
      },
    });
  }

  async approveLoan(tenantId: string, id: string) {
    return this.prisma.loan.update({
      where: { id, tenantId },
      data: { status: 'Approved' },
    });
  }

  async disburseLoan(
    tenantId: string,
    id: string,
    data: { bankAccountId: string; loanAssetAccountId: string },
  ) {
    const loan = await this.prisma.loan.findUnique({ where: { id, tenantId } });
    if (!loan) throw new BadRequestException('Loan not found');
    if (loan.status !== 'Approved')
      throw new BadRequestException(
        'Loan must be approved before disbursement',
      );

    // Check KYC status
    const kyc = await this.prisma.kYCRecord.findUnique({
      where: { loanId: id, tenantId },
    });
    if (!kyc || kyc.verificationStatus !== 'Verified') {
      throw new BadRequestException(
        'KYC must be verified before loan disbursement',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ledger.checkPeriodLock(tenantId, new Date(), tx);
      // 1. Create Journal Entry for Disbursement
      const journal = await this.ledger.createJournalEntry(
        tenantId,
        {
          date: new Date().toISOString(),
          description: `Loan disbursement for loan ${id}`,
          reference: `LOAN_DISB_${id}`,
          transactions: [
            {
              accountId: data.loanAssetAccountId,
              type: 'Debit',
              amount: loan.loanAmount.toNumber(),
              description: 'Loan principal amount',
            },
            {
              accountId: data.bankAccountId,
              type: 'Credit',
              amount: loan.loanAmount.toNumber(),
              description: 'Disbursement from bank',
            },
          ],
          correlationId: this.traceService.getCorrelationId(), // Trace Link
        },
        tx,
      );

      // 2. Generate EMI Schedule (Equated Monthly Installment)
      const loanAmount = new Decimal(loan.loanAmount as any);
      const tenureMonths = new Decimal(loan.tenureMonths);
      const baseMonthlyRate = new Decimal(loan.interestRate).div(100).div(12);

      // Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
      let emiAmount: Decimal;
      if (baseMonthlyRate.equals(0)) {
        emiAmount = loanAmount.div(tenureMonths);
      } else {
        const onePlusRToN = new Decimal(1).add(baseMonthlyRate).pow(tenureMonths.toNumber());
        emiAmount = loanAmount.mul(baseMonthlyRate).mul(onePlusRToN).div(onePlusRToN.sub(1));
      }

      const emiPromises = [];
      let currentPrincipalBalance = loanAmount;

      for (let i = 1; i <= loan.tenureMonths; i++) {
        const dueDate = new Date(loan.startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        let monthlyInterestPart = currentPrincipalBalance.mul(baseMonthlyRate);
        let principalPart = emiAmount.sub(monthlyInterestPart);

        if (i === loan.tenureMonths) {
          principalPart = currentPrincipalBalance;
          emiAmount = principalPart.add(monthlyInterestPart);
        }

        emiPromises.push(
          tx.eMISchedule.create({
            data: {
              tenantId,
              loanId: id,
              dueDate,
              principalPart: principalPart.toDecimalPlaces(2),
              interestPart: monthlyInterestPart.toDecimalPlaces(2),
              totalEMI: emiAmount.toDecimalPlaces(2),
              status: 'Pending',
              correlationId: this.traceService.getCorrelationId(),
            },
          }),
        );
        currentPrincipalBalance = currentPrincipalBalance.sub(principalPart);
      }
      await Promise.all(emiPromises);

      // 3. Update Loan Status
      return tx.loan.update({
        where: { id, tenantId },
        data: {
          status: 'Active',
          disbursedDate: new Date(),
          journalEntryId: journal.id,
        },
      });
    });
  }

  // --- Interest Accrual Engine (Batch Process) ---
  async runDailyInterestAccrual(tenantId: string) {
    const activeLoans = await this.prisma.loan.findMany({
      where: { tenantId, status: 'Active' },
      include: {
        emiSchedule: {
          where: { status: 'Paid' },
        },
      },
    });

    if (activeLoans.length === 0) return { accrued: 0 };

    // BUG-005 FIX: Idempotency check to prevent duplicate batch runs on the same day.
    // Checks if any accrual was already logged for this tenant since midnight UTC.
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const existingRun = await this.prisma.interestAccrual.findFirst({
      where: {
        tenantId,
        date: { gte: startOfDay },
      },
    });

    if (existingRun) {
      return { accrued: 0, message: 'Daily interest accrual already completed for today.' };
    }

    const today = new Date().toISOString();
    const accrualData: {
      tenantId: string;
      loanId: string;
      amount: Decimal;
      correlationId: string | null;
    }[] = [];

    const interestReceivableAcc = await this.prisma.account.findFirst({
      where: {
        tenantId,
        name: { equals: 'Interest Receivable', mode: 'insensitive' },
      },
    });
    const interestRevenueAcc = await this.prisma.account.findFirst({
      where: {
        tenantId,
        name: { equals: 'Interest Income - Loans', mode: 'insensitive' },
      },
    });

    if (!interestReceivableAcc || !interestRevenueAcc) {
      throw new BadRequestException(
        'Required NBFC chart of accounts not found. Please initialize accounts.',
      );
    }

    for (const loan of activeLoans) {
      const paidPrincipal = loan.emiSchedule.reduce(
        (sum, emi) => sum.add(new Decimal(emi.principalPart as any)),
        new Decimal(0),
      );
      const currentPrincipal = new Decimal(loan.loanAmount as any).sub(paidPrincipal);

      const dailyInterest = currentPrincipal
        .mul(new Decimal(loan.interestRate as any))
        .div(100)
        .div(365)
        .toDecimalPlaces(6); // Enhanced Precision for Daily Accruals

      if (dailyInterest.gt(0)) {
        accrualData.push({
          tenantId,
          loanId: loan.id,
          amount: dailyInterest,
          correlationId: this.traceService.getCorrelationId() ?? null,
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ledger.checkPeriodLock(tenantId, new Date(), tx);

      const journal = await this.ledger.createJournalEntry(
        tenantId,
        {
          date: today,
          description: `Batch daily interest accrual — ${accrualData.length} loans`,
          reference: `BATCH_INT_ACCR_${Date.now()}`,
          transactions: accrualData.flatMap((a) => [
            {
              accountId: interestReceivableAcc.id,
              type: 'Debit' as const,
              amount: a.amount.toNumber(),
              description: `Interest receivable: loan ${a.loanId}`,
            },
            {
              accountId: interestRevenueAcc.id,
              type: 'Credit' as const,
              amount: a.amount.toNumber(),
              description: `Interest revenue: loan ${a.loanId}`,
            },
          ]),
        },
        tx as any,
      );

      await tx.interestAccrual.createMany({
        data: accrualData.map((a) => ({
          tenantId: a.tenantId,
          loanId: a.loanId,
          amount: a.amount,
          journalEntryId: journal.id,
          correlationId: a.correlationId,
        })),
      });

      return { accrued: accrualData.length, journalId: journal.id };
    });
  }

  // --- KYC Workflow ---
  async submitKYC(tenantId: string, loanId: string, data: any) {
    return this.prisma.kYCRecord.create({
      data: {
        tenantId,
        loanId,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        documentUrl: data.documentUrl,
        verificationStatus: 'Pending',
      },
    });
  }

  async updateKYCStatus(tenantId: string, loanId: string, status: string) {
    return this.prisma.kYCRecord.update({
      where: { loanId, tenantId },
      data: {
        verificationStatus: status,
        verifiedAt: status === 'Verified' ? new Date() : undefined,
      },
    });
  }

  async recalculateLoanSchedule(
    tenantId: string,
    loanId: string,
    newRate: number,
  ) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId, tenantId },
      include: { emiSchedule: { where: { status: 'Pending' } } },
    });

    if (!loan) throw new BadRequestException('Loan not found');
    if (loan.status !== 'Active')
      throw new BadRequestException('Can only recalculate active loans');

    const pendingEmis = loan.emiSchedule;
    if (pendingEmis.length === 0)
      return { message: 'No pending EMIs to recalculate' };

    const remainingPrincipal = pendingEmis.reduce(
      (sum: Decimal, emi: any) => sum.add(emi.principalPart),
      new Decimal(0),
    );
    const monthlyInterestRate = new Decimal(newRate).div(100).div(12);

    return this.prisma.$transaction(async (tx) => {
      await this.ledger.checkPeriodLock(tenantId, new Date(), tx);

      await tx.loan.update({
        where: { id: loanId, tenantId },
        data: { interestRate: newRate },
      });

      const count = pendingEmis.length;
      const updatedEmis = [];
      let currentBalance = remainingPrincipal;

      let newEmiAmount: Decimal;
      if (monthlyInterestRate.equals(0)) {
        newEmiAmount = remainingPrincipal.div(count);
      } else {
        const onePlusRToN = new Decimal(1).add(monthlyInterestRate).pow(count);
        newEmiAmount = remainingPrincipal.mul(monthlyInterestRate).mul(onePlusRToN).div(onePlusRToN.sub(1));
      }

      for (let i = 0; i < count; i++) {
        const emi = pendingEmis[i];
        const interestPart = currentBalance.mul(monthlyInterestRate);
        let principalPart = newEmiAmount.sub(interestPart);

        if (i === count - 1) {
          principalPart = currentBalance;
          newEmiAmount = principalPart.add(interestPart);
        }

        updatedEmis.push(
          tx.eMISchedule.update({
            where: { id: emi.id },
            data: {
              principalPart: principalPart.toDecimalPlaces(2),
              interestPart: interestPart.toDecimalPlaces(2),
              totalEMI: newEmiAmount.toDecimalPlaces(2),
              correlationId: this.traceService.getCorrelationId(),
            },
          }),
        );
        currentBalance = currentBalance.sub(principalPart);
      }

      await Promise.all(updatedEmis);
      return { loanId, newRate, remainingPrincipal, pendingTenure: count };
    });
  }
}
