/**
 * AnomalyAlertService — Runtime Anomaly Detection
 *
 * Monitors the AuditLog stream for known attack patterns and operational anomalies.
 * Raises structured NestJS Logger alerts when thresholds are breached.
 *
 * ALERT TYPES:
 *  - AUTH_FAILURE_BURST: >= 5 login failures from same IP within 5 minutes
 *  - STOCK_NEGATIVE_ATTEMPTED: Any attempt to set stock below zero
 *  - DUPLICATE_PAYROLL_BLOCKED: Application-layer duplicate payroll block triggered
 *
 * INTEGRATION:
 * Call the relevant check method from the service that performs the operation.
 * The service does NOT block — it only logs the alert at ERROR level.
 * In a production system, these Logger.error calls would be forwarded to
 * an alerting channel (PagerDuty, Slack, etc.) via a log drain.
 *
 * Future: Replace Logger.error with a proper alerting integration (e.g. Resend email to owner).
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TraceService } from './trace.service';
import { MailService } from '../../system/services/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnomalyAlertService {
    private readonly logger = new Logger('SECURITY_ANOMALY');

    constructor(
        private readonly prisma: PrismaService,
        private readonly traceService: TraceService,
        private readonly mail: MailService,
        private readonly config: ConfigService,
    ) { }

    private getContext(): string {
        const cid = this.traceService.getCorrelationId();
        return cid ? `[CID: ${cid}] ` : '';
    }

    private async dispatchAlert(subject: string, message: string) {
        const adminEmail = this.config.get<string>('SYSTEM_ADMIN_EMAIL') || 'admin@klypso.in';
        await this.mail.sendEmail(
            adminEmail,
            `Nexus Alert: ${subject}`,
            `<div style="font-family: monospace; background: #fee2e2; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
                <h2 style="color: #991b1b; margin-top: 0;">Nexus Security/Operational Alert</h2>
                <p><strong>CID:</strong> ${this.traceService.getCorrelationId() || 'N/A'}</p>
                <p><strong>Incident:</strong> ${subject}</p>
                <p><strong>Details:</strong> ${message}</p>
                <p style="font-size: 0.8em; color: #7f1d1d;">TIMESTAMP: ${new Date().toISOString()}</p>
             </div>`
        ).catch(e => this.logger.error('Failed to dispatch alert email:', e));
    }

    /**
     * Check for authentication failure burst from the same IP address.
     */
    async checkAuthFailureBurst(ipAddress: string): Promise<void> {
        if (!ipAddress) return;

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const BURST_THRESHOLD = 5;

        const failureCount = await (this.prisma as any).auditLog.count({
            where: {
                action: 'USER_LOGIN_FAILURE',
                ipAddress,
                createdAt: { gte: fiveMinutesAgo },
            },
        });

        if (failureCount >= BURST_THRESHOLD) {
            const msg = `AUTH_FAILURE_BURST detected from IP ${ipAddress}: ${failureCount} failed login attempts in the last 5 minutes. Possible brute force attack.`;
            this.logger.error(`${this.getContext()}${msg}`);
            await this.dispatchAlert('AUTH_BRUTE_FORCE_FAILURE', msg);
        }
    }

    /**
     * Log and alert when a stock decrement is rejected.
     */
    async alertNegativeStockAttempt(tenantId: string, productId: string, requestedQty: number) {
        const msg = `STOCK_NEGATIVE_ATTEMPTED: Tenant ${tenantId} tried to decrement product ${productId} by ${requestedQty} but stock is insufficient.`;
        this.logger.error(`${this.getContext()}${msg}`);
        // Not dispatching email for retail stock errors unless they happen at scale.
    }

    /**
     * Log and alert on duplicate payroll.
     */
    async alertDuplicatePayrollBlocked(tenantId: string, employeeId: string, period: string) {
        const msg = `DUPLICATE_PAYROLL_BLOCKED: Tenant ${tenantId}, Employee ${employeeId}, Period ${period}. Application-layer idempotency check triggered.`;
        this.logger.error(`${this.getContext()}${msg}`);
    }

    /**
     * Log and alert when the audit log hash chain verification fails.
     */
    async alertAuditChainTamper(tenantId: string, entryId: string) {
        const msg = `AUDIT_CHAIN_TAMPER DETECTED: Tenant ${tenantId}, AuditLog entry ${entryId} has a hash mismatch. Forensic corruption possible.`;
        this.logger.error(`${this.getContext()}${msg}`);
        await this.dispatchAlert('AUDIT_LOG_TAMPERING_DETECTED', msg);
    }
}
