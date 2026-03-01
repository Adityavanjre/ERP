import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from './billing.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AutomationWorkerService {
    private readonly logger = new Logger(AutomationWorkerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly billingService: BillingService,
    ) { }

    /**
     * Identifies tenants whose grace period has ended and downgrades them.
     * Runs exactly at midnight every day.
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleGracePeriodExpirations() {
        this.logger.log('Starting daily sweep for expired grace periods...');

        try {
            // Find all tenants still in GracePeriod whose grace period ended BEFORE today
            const expiredTenants = await this.prisma.tenant.findMany({
                where: {
                    subscriptionStatus: SubscriptionStatus.GracePeriod,
                    gracePeriodEndsAt: {
                        lte: new Date(),
                    },
                },
                select: { id: true, name: true, gracePeriodEndsAt: true },
            });

            if (expiredTenants.length === 0) {
                this.logger.log('No grace period expirations found today.');
                return;
            }

            this.logger.log(`Found ${expiredTenants.length} tenants with expired grace periods.`);

            let downgradedCount = 0;
            let failedCount = 0;

            for (const tenant of expiredTenants) {
                try {
                    this.logger.log(`Downgrading tenant [${tenant.name}]...`);
                    await this.billingService.downgradeToReadOnly(
                        tenant.id,
                        `Automated Grace Period Expiration (Ended: ${tenant.gracePeriodEndsAt?.toISOString()})`
                    );
                    downgradedCount++;
                } catch (error: any) {
                    failedCount++;
                    this.logger.error(`Failed to downgrade tenant ${tenant.id}: ${error.message}`, error.stack);
                }
            }

            this.logger.log(`Daily Sweep Complete. Successfully downgraded: ${downgradedCount}, Failed: ${failedCount}`);

        } catch (e: any) {
            this.logger.error(`FATAL ERROR in Grace Period Sweep: ${e.message}`, e.stack);
        }
    }

}
