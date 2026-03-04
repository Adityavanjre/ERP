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
    async addInterestSlabs(tenantId: string, loanId: string, slabs: { thresholdAmount: number, interestRate: number }[]) {
        return this.prisma.loanInterestSlab.createMany({
            data: slabs.map(s => ({ ...s, tenantId, loanId }))
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

    async disburseLoan(tenantId: string, id: string, data: { bankAccountId: string, loanAssetAccountId: string }) {
        const loan = await this.prisma.loan.findUnique({ where: { id, tenantId } });
        if (!loan) throw new BadRequestException('Loan not found');
        if (loan.status !== 'Approved') throw new BadRequestException('Loan must be approved before disbursement');

        // Check KYC status
        const kyc = await this.prisma.kYCRecord.findUnique({ where: { loanId: id, tenantId } });
        if (!kyc || kyc.verificationStatus !== 'Verified') {
            throw new BadRequestException('KYC must be verified before loan disbursement');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Create Journal Entry for Disbursement
            // Debit: Loan Asset Account
            // Credit: Bank Account
            const journal = await this.ledger.createJournalEntry(tenantId, {
                date: new Date().toISOString(),
                description: `Loan disbursement for loan ${id}`,
                reference: `LOAN_DISB_${id}`,
                transactions: [
                    {
                        accountId: data.loanAssetAccountId,
                        type: 'Debit',
                        amount: Number(loan.loanAmount),
                        description: 'Loan principal amount',
                    },
                    {
                        accountId: data.bankAccountId,
                        type: 'Credit',
                        amount: Number(loan.loanAmount),
                        description: 'Disbursement from bank',
                    },
                ],
                correlationId: this.traceService.getCorrelationId(), // Trace Link
            }, tx);

            // 2. Generate EMI Schedule (Graduated Slabs Support)
            const slabs = await tx.loanInterestSlab.findMany({
                where: { loanId: id, tenantId },
                orderBy: { thresholdAmount: 'asc' }
            });

            const monthlyPrincipal = new Decimal(loan.loanAmount).div(loan.tenureMonths);
            const baseMonthlyRate = new Decimal(loan.interestRate).div(100).div(12);

            const emiPromises = [];
            for (let i = 1; i <= loan.tenureMonths; i++) {
                const dueDate = new Date(loan.startDate);
                dueDate.setMonth(dueDate.getMonth() + i);

                const remainingBalance = new Decimal(loan.loanAmount).sub(monthlyPrincipal.mul(i - 1));

                // 100x Logic: Graduated Interest Calculus
                let monthlyInterestPart = new Decimal(0);

                if (slabs.length > 0) {
                    let tempBalance = remainingBalance;
                    let prevThreshold = new Decimal(0);

                    for (const slab of slabs) {
                        const threshold = new Decimal(slab.thresholdAmount);
                        const slabPrincipal = Decimal.min(tempBalance, threshold.sub(prevThreshold));

                        if (slabPrincipal.greaterThan(0)) {
                            const slabMonthlyRate = new Decimal(slab.interestRate).div(100).div(12);
                            monthlyInterestPart = monthlyInterestPart.add(slabPrincipal.mul(slabMonthlyRate));
                            tempBalance = tempBalance.sub(slabPrincipal);
                            prevThreshold = threshold;
                        }
                    }
                    if (tempBalance.greaterThan(0)) {
                        monthlyInterestPart = monthlyInterestPart.add(tempBalance.mul(baseMonthlyRate));
                    }
                } else {
                    monthlyInterestPart = remainingBalance.mul(baseMonthlyRate);
                }

                const totalEMI = monthlyPrincipal.add(monthlyInterestPart);

                emiPromises.push(tx.eMISchedule.create({
                    data: {
                        tenantId,
                        loanId: id,
                        dueDate,
                        principalPart: monthlyPrincipal,
                        interestPart: monthlyInterestPart,
                        totalEMI: totalEMI,
                        status: 'Pending',
                        correlationId: this.traceService.getCorrelationId(),
                    },
                }));
            }
            await Promise.all(emiPromises);

            // 3. Update Loan Status
            return tx.loan.update({
                where: { id },
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
        });

        if (activeLoans.length === 0) return { accrued: 0 };

        // Compute all accruals in-memory — no DB calls per loan
        const today = new Date().toISOString();
        const accrualData: { tenantId: string; loanId: string; amount: Decimal; correlationId: string | null }[] = [];

        for (const loan of activeLoans) {
            const dailyInterest = new Decimal(loan.loanAmount).mul(loan.interestRate).div(100).div(365);
            accrualData.push({
                tenantId,
                loanId: loan.id,
                amount: dailyInterest,
                correlationId: this.traceService.getCorrelationId() ?? null,
            });
        }

        // Single transaction: bulk-create journal entry + all accrual records
        return this.prisma.$transaction(async (tx) => {
            // Batch journal entry for all accruals (single compound entry)
            const journal = await this.ledger.createJournalEntry(tenantId, {
                date: today,
                description: `Batch daily interest accrual — ${accrualData.length} loans`,
                reference: `BATCH_INT_ACCR_${Date.now()}`,
                transactions: accrualData.flatMap(a => ([
                    {
                        accountId: 'INT_RECEIVABLE_ACC',
                        type: 'Debit' as const,
                        amount: Number(a.amount),
                        description: `Interest receivable: loan ${a.loanId}`,
                    },
                    {
                        accountId: 'INT_REVENUE_ACC',
                        type: 'Credit' as const,
                        amount: Number(a.amount),
                        description: `Interest revenue: loan ${a.loanId}`,
                    },
                ])),
            }, tx);

            // Bulk-create all accrual records in a single INSERT
            await tx.interestAccrual.createMany({
                data: accrualData.map(a => ({
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
                verificationStatus: 'Pending',
            },
        });
    }

    async updateKYCStatus(tenantId: string, loanId: string, status: string) {
        return this.prisma.kYCRecord.update({
            where: { loanId, tenantId },
            data: {
                verificationStatus: status,
                verifiedAt: status === 'Verified' ? new Date() : undefined
            },
        });
    }

    /**
     * NBFC Depth: Mid-Term Floating Rate Recalculation
     * Handles specialized financial math that Excel fails to track at scale during mid-term adjustments.
     */
    async recalculateLoanSchedule(tenantId: string, loanId: string, newRate: number) {
        const loan = await this.prisma.loan.findUnique({
            where: { id: loanId, tenantId },
            include: { emiSchedule: { where: { status: 'Pending' } } }
        });

        if (!loan) throw new BadRequestException('Loan not found');
        if (loan.status !== 'Active') throw new BadRequestException('Can only recalculate active loans');

        const pendingEmis = loan.emiSchedule;
        if (pendingEmis.length === 0) return { message: 'No pending EMIs to recalculate' };

        // 1. Calculate remaining principal
        const remainingPrincipal = pendingEmis.reduce((sum: Decimal, emi: any) => sum.add(emi.principalPart), new Decimal(0));
        const monthlyInterestRate = new Decimal(newRate).div(100).div(12);

        return this.prisma.$transaction(async (tx) => {
            // 2. Update loan with new interest rate
            await tx.loan.update({
                where: { id: loanId },
                data: { interestRate: newRate }
            });

            // 3. Regen pending EMIs (Amortized based on remaining principal)
            const count = pendingEmis.length;
            const updatedEmis = [];

            for (let i = 0; i < count; i++) {
                const emi = pendingEmis[i];
                const principalPart = remainingPrincipal.div(count);
                const interestPart = remainingPrincipal.sub(principalPart.mul(i)).mul(monthlyInterestRate);
                const totalEMI = principalPart.add(interestPart);

                updatedEmis.push(tx.eMISchedule.update({
                    where: { id: emi.id },
                    data: {
                        interestPart,
                        totalEMI,
                        correlationId: this.traceService.getCorrelationId()
                    }
                }));
            }

            await Promise.all(updatedEmis);
            return { loanId, newRate, remainingPrincipal, pendingTenure: count };
        });
    }
}
