import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditVerificationService implements OnModuleInit {
    private readonly logger = new Logger(AuditVerificationService.name);

    constructor(private prisma: PrismaService) { }

    onModuleInit() {
        // Start background job every hour
        setInterval(() => this.verifySystemTraceability(), 3600000);
        this.logger.log('Background audit verification job scheduled.');
    }

    async verifySystemTraceability() {
        this.logger.log('Starting background audit verification job...');

        // 1. Check for orphaned mutation logs (missing correlation link to Ledger or Inventory)
        // We only check for POST/PUT/PATCH/DELETE actions
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const mutations = await this.prisma.auditLog.findMany({
            where: {
                createdAt: { gte: yesterday },
                action: { in: ['POST', 'PUT', 'PATCH', 'DELETE'] },
                correlationId: { not: null }
            },
            select: { correlationId: true, resource: true }
        });

        for (const log of mutations) {
            // If it's an accounting resource, it SHOULD have a journal entry
            if (log.resource.includes('/accounting/invoice') || log.resource.includes('/accounting/payment')) {
                const journal = await this.prisma.journalEntry.findFirst({
                    where: { correlationId: log.correlationId }
                });
                if (!journal) {
                    this.logger.warn(`TRACEABILITY_GAP: Audit Log ${log.correlationId} for ${log.resource} has no linked Journal Entry!`);
                }
            }

            // If it's an inventory mutation, it SHOULD have a stock movement
            if (log.resource.includes('/inventory/import') || log.resource.includes('/inventory/adjust')) {
                const movement = await this.prisma.stockMovement.findFirst({
                    where: { correlationId: log.correlationId }
                });
                if (!movement) {
                    this.logger.warn(`TRACEABILITY_GAP: Audit Log ${log.correlationId} for ${log.resource} has no linked Stock Movement!`);
                }
            }
        }

        // 2. Check for telemetry anomalies (Response time > 2s)
        const slowRequests = await this.prisma.auditLog.count({
            where: {
                createdAt: { gte: yesterday },
                responseTimeMs: { gt: 2000 }
            }
        });

        if (slowRequests > 0) {
            this.logger.warn(`TELEMETRY_ALERT: ${slowRequests} requests took longer than 2 seconds in the last 24h.`);
        }

        this.logger.log('Audit verification job completed.');
    }
}
