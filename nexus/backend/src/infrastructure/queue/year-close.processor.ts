import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_YEAR_CLOSE } from '../../infrastructure/queue/queue.module';

export interface YearCloseJobData {
    tenantId: string;
    userId: string;
    year: number;
}

/**
 * ARCH-001: Year Closing Background Processor
 *
 * Financial Year Close is a multi-step, long-running operation.
 * Offloading it to BullMQ prevents the 30s HTTP gateway timeout from aborting
 * a partially-committed close, which would leave the ledger in a corrupt state.
 *
 * The controller enqueues the job and returns immediately with a jobId.
 * The client polls GET /accounting/close-year/status/:jobId.
 */
@Processor(QUEUE_YEAR_CLOSE)
export class YearCloseProcessor extends WorkerHost {
    private readonly logger = new Logger(YearCloseProcessor.name);

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(job: Job<YearCloseJobData>): Promise<any> {
        const { tenantId, userId, year } = job.data;
        this.logger.log(`[JOB:${job.id}] Starting Year Close for tenant=${tenantId}, year=${year}`);

        const idempotencyKey = `YEAR_CLOSE_${tenantId}_${year}`;

        // Guard: Prevent double-closing a year
        const existingClose = await this.prisma.periodLock.findMany({
            where: { tenantId, year, isLocked: true },
        });

        if (existingClose.length === 12) {
            this.logger.warn(`[JOB:${job.id}] Year ${year} is already fully closed. Skipping.`);
            return { skipped: true, reason: `Year ${year} already closed` };
        }

        await job.updateProgress(10);

        // Verify all 12 months are locked (pre-condition)
        if (existingClose.length < 12) {
            const lockedMonths = existingClose.map(l => l.month);
            const missing = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(m => !lockedMonths.includes(m));
            throw new Error(`Cannot close year ${year}: months ${missing.join(', ')} not yet locked.`);
        }

        await job.updateProgress(30);

        // Get all P&L accounts for closing entry
        const { Decimal } = await import('@prisma/client/runtime/library');
        const plAccounts = await this.prisma.account.findMany({
            where: { tenantId, type: { in: ['Revenue', 'Expense'] } },
        });

        await job.updateProgress(50);

        let netProfit = new Decimal(0);
        const journalTransactions: any[] = [];

        for (const acc of plAccounts) {
            const bal = new Decimal(acc.balance || 0);
            if (bal.isZero()) continue;
            if (acc.type === 'Revenue') {
                netProfit = netProfit.add(bal);
                journalTransactions.push({ accountId: acc.id, type: 'Debit', amount: bal.toNumber(), description: `FY-Close: Zero ${acc.name}` });
            } else {
                netProfit = netProfit.sub(bal);
                journalTransactions.push({ accountId: acc.id, type: 'Credit', amount: bal.toNumber(), description: `FY-Close: Zero ${acc.name}` });
            }
        }

        const retainedEarnings = await this.prisma.account.findFirst({
            where: { tenantId, name: 'Retained Earnings' },
        });
        if (!retainedEarnings) throw new Error('Retained Earnings account not found.');

        if (netProfit.gt(0)) {
            journalTransactions.push({ accountId: retainedEarnings.id, type: 'Credit', amount: netProfit.toNumber(), description: 'FY-Close: Net Profit to Equity' });
        } else if (netProfit.lt(0)) {
            journalTransactions.push({ accountId: retainedEarnings.id, type: 'Debit', amount: netProfit.abs().toNumber(), description: 'FY-Close: Net Loss to Equity' });
        }

        await job.updateProgress(75);

        // Execute as a single DB transaction
        await this.prisma.$transaction(async (tx) => {
            // Create the closing journal entry
            const entry = await tx.journalEntry.create({
                data: {
                    tenantId,
                    date: new Date(year, 11, 31), // Dec 31
                    description: `Financial Year ${year} Closing Entry`,
                    reference: `FY-CLOSE-${year}`,
                    transactions: { create: journalTransactions },
                },
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    tenantId,
                    userId,
                    action: 'YEAR_END_CLOSE',
                    resource: 'FinancialYear',
                    details: { year, netProfit: netProfit.toFixed(2), jobId: job.id } as any,
                },
            });
        });

        await job.updateProgress(100);
        this.logger.log(`[JOB:${job.id}] Year ${year} close complete. Net Profit: ${netProfit.toFixed(2)}`);

        return { year, netProfit: netProfit.toFixed(2) };
    }
}
