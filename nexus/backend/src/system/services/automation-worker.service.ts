import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
// REMOVED: BillingService - subscription system removed
// REMOVED: SubscriptionStatus - subscription system removed
import { SystemAuditService } from './system-audit.service';
import { AnomalyAlertService } from '../../common/services/anomaly-alert.service';
import { WebhookSecretRotationService } from './webhook-secret-rotation.service';

@Injectable()
export class AutomationWorkerService {
  private readonly logger = new Logger(AutomationWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    // REMOVED: billingService - subscription system removed
    private readonly auditService: SystemAuditService,
    private readonly alerts: AnomalyAlertService,
    private readonly webhookRotation: WebhookSecretRotationService,
  ) {}

  /**
   * REMOVED: Grace period expiration cron job - subscription system removed
   * Identifies tenants whose grace period has ended and downgrades them.
   * Runs exactly at midnight every day.
   */
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async handleGracePeriodExpirations() {
  //   // REMOVED - Subscription system removed
  // }

  /**
   * ARCH-003: Daily Financial Integrity Scan.
   * Verifies that Dr == Cr for all tenants.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runFinancialIntegrityAudit() {
    this.logger.log('[AUDIT] Starting global financial integrity scan...');
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true },
    });

    for (const tenant of tenants) {
      try {
        const report = await this.auditService.verifyFinancialIntegrity(
          tenant.id,
        );
        if (report.status === 'FAIL') {
          const drift = report.forensicReport.financials.tbDrift;
          const msg = `Financial Invariant Violation in tenant ${tenant.name} (${tenant.id}). TB Drift: ${drift}. Risk Score: ${report.forensicReport.riskScore}`;
          this.logger.error(`[CRITICAL_AUDIT] ${msg}`);

          await this.alerts.alertAuditChainTamper(
            tenant.id,
            'GLOBAL_INTEGRITY_CHECK',
          );
          // Note: alertAuditChainTamper is used here for its high-priority fatal dispatch.
        }
      } catch (e: any) {
        this.logger.error(`Failed to audit tenant ${tenant.id}: ${e.message}`);
      }
    }
    this.logger.log('[AUDIT] Global financial integrity scan complete.');
  }

  /**
   * SEC-017: Nightly sweep of expired webhook grace secrets.
   * Runs at 2 AM to retire any grace-period secrets whose window has elapsed.
   */
  @Cron('0 2 * * *') // 2 AM every day
  async sweepExpiredWebhookGraceSecrets() {
    this.logger.log(
      '[SEC-017] Sweeping expired webhook grace-period secrets...',
    );
    try {
      await this.webhookRotation.sweepExpiredGraceSecrets();
    } catch (e: any) {
      this.logger.error(
        `[SEC-017] Failed to sweep grace secrets: ${e.message}`,
      );
    }
  }
}
