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

@Injectable()
export class AnomalyAlertService {
    private readonly logger = new Logger('SECURITY_ANOMALY');

    constructor(
        private readonly prisma: PrismaService,
        private readonly traceService: TraceService,
    ) { }

    private getContext(): string {
        const cid = this.traceService.getCorrelationId();
        return cid ? `[CID: ${cid}] ` : '';
    }

    /**
     * Check for authentication failure burst from the same IP address.
     * Triggers alert if >= 5 USER_LOGIN_FAILURE events from the same IP in the last 5 minutes.
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
            this.logger.error(
                `${this.getContext()}AUTH_FAILURE_BURST detected from IP ${ipAddress}: ` +
                `${failureCount} failed login attempts in the last 5 minutes. ` +
                `Possible credential stuffing or brute force attack. ` +
                `ACTION REQUIRED: Verify IP ${ipAddress} is not malicious. Consider rate limiting or blocking.`,
            );
        }
    }

    /**
     * Log and alert when a stock decrement is rejected because it would cause negative stock.
     * This indicates either a data entry error or a race condition that was correctly caught.
     */
    alertNegativeStockAttempt(tenantId: string, productId: string, requestedQty: number): void {
        this.logger.error(
            `${this.getContext()}STOCK_NEGATIVE_ATTEMPTED: Tenant ${tenantId} tried to decrement ` +
            `product ${productId} by ${requestedQty} but stock is insufficient. ` +
            `The operation was blocked. Investigate for data entry error or race condition.`,
        );
    }

    /**
     * Log and alert when a duplicate payroll entry is blocked by the application-layer check.
     * Should only be triggered by a bug (double-submit) or a B2B attack.
     */
    alertDuplicatePayrollBlocked(tenantId: string, employeeId: string, period: string): void {
        this.logger.error(
            `${this.getContext()}DUPLICATE_PAYROLL_BLOCKED: Tenant ${tenantId} attempted to create a duplicate ` +
            `payroll for employee ${employeeId} for period ${period}. ` +
            `Application-layer idempotency check blocked this. Database @@unique constraint is the final guard.`,
        );
    }

    /**
     * Log and alert when the audit log hash chain verification fails.
     * This is the most critical alert — it indicates potential audit log tampering.
     */
    alertAuditChainTamper(tenantId: string, entryId: string): void {
        this.logger.error(
            `${this.getContext()}AUDIT_CHAIN_TAMPER DETECTED: Tenant ${tenantId}, AuditLog entry ${entryId} ` +
            `has a hash mismatch. This indicates the audit log was modified after the fact. ` +
            `CRITICAL: Treat this as a security incident. Run verify-audit-chain immediately.`,
        );
    }
}
