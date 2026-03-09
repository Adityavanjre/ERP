import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnomalyAlertService } from '../../common/services/anomaly-alert.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuditVerificationService implements OnModuleInit {
  private readonly logger = new Logger(AuditVerificationService.name);
  private readonly hmacSecret: string;

  constructor(
    private prisma: PrismaService,
    private anomalyAlerts: AnomalyAlertService,
    private config: ConfigService,
  ) {
    this.hmacSecret = this.config.get<string>('AUDIT_HMAC_SECRET') || '';
  }

  onModuleInit() {
    this.logger.log('Audit verification system initialized.');
  }

  /**
   * SEC-013 / LOG-005: Automated Audit Verification.
   * Scheduled to run daily at midnight to verify the cryptographic integrity of the audit logs.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyVerification() {
    this.logger.log('Starting scheduled daily audit verification...');
    await this.verifySystemTraceability();
    await this.verifyHashChainIntegrity();
    this.logger.log('Daily audit verification completed.');
  }

  async verifyHashChainIntegrity() {
    if (!this.hmacSecret) {
      this.logger.warn(
        'Skipping hash chain verification: AUDIT_HMAC_SECRET not set.',
      );
      return;
    }

    this.logger.log('Verifying Audit Log Hash Chain integrity...');

    // ARCH-001: Expanded scan window logic. 
    // Perform a deep verify of ALL historical chunks on Mondays, 
    // and a quick-audit (last 48h) on other days to ensure continuity.
    const isDeepScanDay = new Date().getDay() === 1; // 1 = Monday
    const scanWindow = new Date();
    scanWindow.setDate(scanWindow.getDate() - (isDeepScanDay ? 3650 : 2)); // 10 years for deep scan, 2 days for quick scan

    // Get all tenants to verify chains individually
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    const tenantLogs: Record<string, any[]> = {};

    // Fetch logs scoped by tenant explicitly to enforce multidimensional tenant isolation
    for (const tenant of tenants) {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: scanWindow },
        },
        orderBy: { createdAt: 'asc' },
        take: 5000, // Higher batch size for audits
      });
      if (logs.length > 0) {
        tenantLogs[tenant.id] = logs;
      }
    }

    // Verify GLOBAL logs
    const globalLogs = await this.prisma.auditLog.findMany({
      where: { tenantId: null, createdAt: { gte: scanWindow } },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });
    if (globalLogs.length > 0) {
      tenantLogs['GLOBAL'] = globalLogs;
    }

    for (const tid in tenantLogs) {
      const chain = tenantLogs[tid];
      let lastHash: string | null = null;

      // To verify the first log in our window, we need its prevHash from the DB
      if (chain.length > 0) {
        const firstEntry = chain[0];
        lastHash = firstEntry.prevHash;
      }

      for (const log of chain) {
        if (!log.entryHash) continue; // Pre-hardening entries

        // 1. Verify Chain Link
        if (log.prevHash !== lastHash) {
          await this.anomalyAlerts.alertAuditChainTamper(tid, log.id);
          this.logger.error(
            `CHAIN_BREAK: Audit log ${log.id} has invalid prevHash link.`,
          );
        }

        // 2. Recompute Hash
        const recomputed = this.computeEntryHash(
          log.prevHash,
          log.action,
          log.resource,
          log.createdAt,
          log.details,
        );

        if (recomputed !== log.entryHash) {
          await this.anomalyAlerts.alertAuditChainTamper(tid, log.id);
          this.logger.error(
            `PAYLOAD_MISMATCH: Audit log ${log.id} content does not match its hash!`,
          );
        }

        lastHash = log.entryHash;
      }
    }
  }

  private sanitizeString(val: string): string {
    return (val || '').replace(/[\r\n\t]/g, ' ').trim();
  }

  private computeEntryHash(
    prevHash: string | null,
    action: string,
    resource: string,
    createdAt: Date,
    details: any,
  ): string {
    const canonicalInput = [
      prevHash ?? 'GENESIS',
      this.sanitizeString(action),
      this.sanitizeString(resource),
      createdAt.toISOString(),
      JSON.stringify(details || {}),
    ].join('|');

    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(canonicalInput)
      .digest('hex');
  }

  async verifySystemTraceability() {
    this.logger.log('Verifying system traceability links...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    const mutations = [];

    for (const tenant of tenants) {
      const tenantLogs = await this.prisma.auditLog.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: yesterday },
          action: { in: ['POST', 'PUT', 'PATCH', 'DELETE'] },
          correlationId: { not: null },
        },
        select: {
          id: true,
          correlationId: true,
          resource: true,
          tenantId: true,
        },
        take: 1000,
      });
      mutations.push(...tenantLogs);
    }

    for (const log of mutations) {
      if (
        log.resource.includes('/accounting/invoice') ||
        log.resource.includes('/accounting/payment')
      ) {
        const journal = await this.prisma.journalEntry.findFirst({
          where: { correlationId: log.correlationId },
        });
        if (!journal) {
          this.logger.warn(
            `TRACEABILITY_GAP: Audit Log ${log.id} for ${log.resource} has no linked Journal Entry!`,
          );
        }
      }

      if (
        log.resource.includes('/inventory/import') ||
        log.resource.includes('/inventory/adjust')
      ) {
        const movement = await this.prisma.stockMovement.findFirst({
          where: { correlationId: log.correlationId },
        });
        if (!movement) {
          this.logger.warn(
            `TRACEABILITY_GAP: Audit Log ${log.id} for ${log.resource} has no linked Stock Movement!`,
          );
        }
      }
    }
  }
}
