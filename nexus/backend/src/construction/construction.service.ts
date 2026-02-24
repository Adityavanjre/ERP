import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { ProjectStatus, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { TraceService } from '../common/services/trace.service';

@Injectable()
export class ConstructionService {
    constructor(
        private prisma: PrismaService,
        private ledger: LedgerService,
        private traceService: TraceService,
    ) { }

    // --- BOQ Tracking (Estimate vs Actual) ---
    async createBOQ(tenantId: string, data: any) {
        return (this.prisma as any).bOQ.create({
            data: {
                tenantId,
                projectId: data.projectId,
                name: data.name,
                totalEstimated: data.totalEstimated,
                items: {
                    create: data.items.map((item: any) => ({
                        tenantId,
                        description: item.description,
                        uom: item.uom,
                        estimatedQty: item.estimatedQty,
                        estimatedRate: item.estimatedRate,
                    })),
                },
                correlationId: this.traceService.getCorrelationId(), // Forensic Trace
            },
            include: { items: true },
        });
    }

    async updateBOQStatus(tenantId: string, id: string, status: string) {
        // Simple hierarchy: Draft -> UnderReview -> Approved
        const boq = await (this.prisma as any).bOQ.findUnique({ where: { id, tenantId } });
        if (!boq) throw new BadRequestException('BOQ not found');

        const allowedTransitions: Record<string, string[]> = {
            'Draft': ['UnderReview'],
            'UnderReview': ['Approved', 'Draft'],
            'Approved': [], // Final
        };

        if (!allowedTransitions[boq.status].includes(status)) {
            throw new BadRequestException(`Invalid status transition from ${boq.status} to ${status}`);
        }

        return (this.prisma as any).bOQ.update({
            where: { id },
            data: { status },
        });
    }

    async updateBOQActuals(tenantId: string, itemId: string, data: { qty: number, rate: number }) {
        const item = await (this.prisma as any).bOQItem.findUnique({ where: { id: itemId, tenantId } });
        if (!item) throw new BadRequestException('BOQ Item not found');

        return this.prisma.$transaction(async (tx) => {
            const updatedItem = await (tx as any).bOQItem.update({
                where: { id: itemId },
                data: {
                    actualQty: { increment: data.qty },
                    actualRate: data.rate,
                },
            });

            // Update total actuals on parent BOQ
            const totalAmount = new Decimal(data.qty).mul(data.rate);
            await (tx as any).bOQ.update({
                where: { id: item.boqId },
                data: { totalActual: { increment: totalAmount } },
            });

            return updatedItem;
        });
    }

    // --- Site-Wise Inventory ---
    async updateSiteStock(tenantId: string, projectId: string, productId: string, qty: number, warehouseId?: string) {
        return (this.prisma as any).siteInventory.upsert({
            where: {
                tenantId_projectId_productId: { tenantId, projectId, productId },
            },
            create: {
                tenantId,
                projectId,
                productId,
                quantity: qty,
                warehouseId,
            },
            update: {
                quantity: { increment: qty },
                correlationId: this.traceService.getCorrelationId(), // Trace Link
            },
        });
    }

    // --- RA Billing (Professional: Retention & Advance Recovery) ---
    async generateRABill(tenantId: string, projectId: string, data: {
        reference: string,
        certifiedAmount: number,
        retentionRate?: number, // e.g. 5 for 5%
        advanceRecoveryRate?: number, // e.g. 10 for 10%
        arAccountId: string,
        revenueAccountId: string,
        retentionAccountId: string,
        advanceRecoveryAccountId?: string,
    }) {
        const project = await (this.prisma as any).project.findUnique({ where: { id: projectId, tenantId } });
        if (!project) throw new BadRequestException('Project not found');

        // Professional Gating: Only bill against Approved BOQs
        const boq = await (this.prisma as any).bOQ.findFirst({
            where: { projectId, tenantId, status: 'Approved' }
        });
        if (!boq) {
            throw new BadRequestException('No Approved BOQ found for this project. RA Billing is locked.');
        }

        const certified = new Decimal(data.certifiedAmount);
        const retentionRate = new Decimal(data.retentionRate || 5).div(100);
        const recoveryRate = new Decimal(data.advanceRecoveryRate || 0).div(100);

        const retentionAmount = certified.mul(retentionRate);
        const recoveryAmount = certified.mul(recoveryRate);
        const netPayable = certified.sub(retentionAmount).sub(recoveryAmount);

        return this.prisma.$transaction(async (tx) => {
            // Create a Journal Entry for the RA Bill with complex splitting
            const entry = await this.ledger.createJournalEntry(tenantId, {
                date: new Date().toISOString(),
                description: `RA Bill Certified: ${project.name} (Ref: ${data.reference})`,
                reference: data.reference,
                transactions: [
                    {
                        accountId: data.arAccountId, // Net Receivable from Client
                        type: TransactionType.Debit,
                        amount: netPayable.toNumber(),
                        description: `RA Bill: Net Payable - ${project.name}`,
                    },
                    {
                        accountId: data.retentionAccountId, // Retention Asset (Long term)
                        type: TransactionType.Debit,
                        amount: retentionAmount.toNumber(),
                        description: `RA Bill: Retention Held (Project: ${project.name})`,
                    },
                    ...(recoveryAmount.gt(0) && data.advanceRecoveryAccountId ? [{
                        accountId: data.advanceRecoveryAccountId, // Reducing the Advance Liability
                        type: TransactionType.Debit,
                        amount: recoveryAmount.toNumber(),
                        description: `RA Bill: Advance Recovery - ${project.name}`,
                    }] : []),
                    {
                        accountId: data.revenueAccountId, // Gross Revenue
                        type: TransactionType.Credit,
                        amount: certified.toNumber(),
                        description: 'Work Certified Revenue (Gross)',
                    },
                ],
                correlationId: this.traceService.getCorrelationId(), // Trace Link
            }, tx);

            // 100x Logic: Automated Retention Release Scheduling
            if (retentionAmount.gt(0)) {
                const release1Date = new Date();
                release1Date.setDate(release1Date.getDate() + 180);

                const release2Date = new Date();
                release2Date.setDate(release2Date.getDate() + 360);

                const halfRetention = retentionAmount.div(2);

                await (tx as any).retentionSchedule.createMany({
                    data: [
                        {
                            tenantId,
                            projectId,
                            amount: halfRetention,
                            releaseDate: release1Date,
                            status: 'Pending',
                            correlationId: this.traceService.getCorrelationId()
                        },
                        {
                            tenantId,
                            projectId,
                            amount: halfRetention,
                            releaseDate: release2Date,
                            status: 'Pending',
                            correlationId: this.traceService.getCorrelationId()
                        }
                    ]
                });
            }

            return {
                journalEntry: entry,
                certified: certified.toFixed(2),
                retention: retentionAmount.toFixed(2),
                recovery: recoveryAmount.toFixed(2),
                netPayable: netPayable.toFixed(2),
            };
        });
    }

    async getRetentionSchedules(tenantId: string, projectId: string) {
        return (this.prisma as any).retentionSchedule.findMany({
            where: { tenantId, projectId },
            orderBy: { releaseDate: 'asc' }
        });
    }
}
