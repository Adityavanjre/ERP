import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * Logs an enterprise-grade audit trail entry.
   */
  async log(data: {
    tenantId?: string;
    userId?: string;
    action: string;
    resource: string;
    details?: any;
    ipAddress?: string;
    channel?: string;
  }) {
    try {
      const finalDetails = {
        ...(data.details || {}),
        ...(data.channel === 'MOBILE'
          ? { mobileIntent: 'MOBILE_INTENT_ONLY' }
          : {}),
      };

      // ARCH-011: Audit Trail HMAC Integrity
      // Fetch the last entry for this tenant to link the hash chain.
      const lastEntry = await this.prisma.auditLog.findFirst({
        where: { tenantId: data.tenantId || null },
        orderBy: { createdAt: 'desc' },
      });

      const prevHash = lastEntry?.entryHash || null;
      const createdAt = new Date();

      // Canonical HMAC Input Generation
      const canonicalInput = [
        prevHash ?? 'GENESIS',
        data.action,
        data.resource,
        createdAt.toISOString(),
        JSON.stringify(finalDetails),
      ].join('|');

      const entryHash = process.env.AUDIT_HMAC_SECRET
        ? crypto
          .createHmac('sha256', process.env.AUDIT_HMAC_SECRET)
          .update(canonicalInput)
          .digest('hex')
        : null;

      return await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          details: finalDetails,
          ipAddress: data.ipAddress,
          channel: data.channel,
          createdAt,
          prevHash,
          entryHash,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `CRITICAL: Audit logging failed for action ${data.action}`,
        err?.stack || err,
      );

      // LOG-004: Ensure system resilience by not breaking the business transaction.
      // We also attempt to report the log failure to Sentry if available.
      if (process.env.SENTRY_DSN) {
        import('@sentry/node')
          .then((Sentry) => {
            Sentry.captureException(err, {
              extra: { auditAction: data.action, auditResource: data.resource },
            });
          })
          .catch(() => void 0);
      }

      return null;
    }
  }

  async getLogs(tenantId: string, resource?: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(resource ? { resource } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Audit logs are strictly immutable and cannot be pruned from the application layer
   * to enforce forensic compliance and non-repudiation.
   * Archival (if necessary for storage) must occur via direct DBA operations and cold storage,
   * never via API soft-wipes.
   */
}
