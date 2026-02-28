import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { TraceService } from './trace.service';

/**
 * LoggingService — Centralized Audit Logging with HMAC-SHA256 Hash Chain
 *
 * Every entry written to AuditLog is chained to the previous entry using HMAC-SHA256.
 * The chain key is AUDIT_HMAC_SECRET (required environment variable).
 * A broken chain (entryHash mismatch) proves tamper, deletion, or injection occurred.
 *
 * Chain verification:
 *   npm run audit:verify-chain --tenantId=<id>
 *
 * Security note: entryHash is optional (nullable = true) during migration period.
 * Once all existing rows are back-filled or a migration adds the NOT NULL constraint,
 * this field should be made required.
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private readonly hmacSecret: string;

  constructor(
    private prisma: PrismaService,
    private traceService: TraceService,
  ) {
    // AUDIT_HMAC_SECRET is required for hash chain integrity.
    // If absent, logging continues but hash chain is disabled (entries get null hashes).
    this.hmacSecret = process.env.AUDIT_HMAC_SECRET || '';
    if (!this.hmacSecret) {
      this.logger.warn(
        'AUDIT_HMAC_SECRET is not set. Audit log hash chain is DISABLED. ' +
        'Add AUDIT_HMAC_SECRET to environment variables to enable tamper detection.',
      );
    }
  }

  private sanitizeString(val: string): string {
    return val.replace(/[\r\n\t]/g, ' ').trim();
  }

  private scrubDetails(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.scrubDetails(item));

    const sensitiveKeys = ['password', 'token', 'secret', 'jwt', 'creditCard', 'cvv', 'mfaSecret', 'totp', 'apiKey'];
    const scrubbed: any = {};
    for (const key in obj) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        scrubbed[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        scrubbed[key] = this.scrubDetails(obj[key]);
      } else {
        scrubbed[key] = obj[key];
      }
    }
    return scrubbed;
  }

  /**
   * Computes HMAC-SHA256 over the canonical audit entry fields.
   * Input: prevHash (or 'GENESIS' for first entry) + action + resource + ISO timestamp + JSON details
   * This deterministic input means the hash can be independently verified.
   */
  private computeEntryHash(
    prevHash: string | null,
    action: string,
    resource: string,
    createdAt: Date,
    details: any,
  ): string {
    const scrubbedDetails = this.scrubDetails(details);
    const canonicalInput = [
      prevHash ?? 'GENESIS',
      this.sanitizeString(action),
      this.sanitizeString(resource),
      createdAt.toISOString(),
      JSON.stringify(scrubbedDetails ?? {}),
    ].join('|');

    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(canonicalInput)
      .digest('hex');
  }

  async log(data: {
    userId?: string;
    tenantId?: string;
    action: string;
    resource: string;
    details?: any;
    channel?: string;
    ipAddress?: string;
    correlationId?: string;
    responseTimeMs?: number;
  }) {
    const correlationId = data.correlationId || this.traceService.getCorrelationId();

    try {
      // Wrap in a SERIALIZABLE transaction so the prevHash fetch + create are atomic.
      // Without this, two concurrent log writes can read the same prevHash, forking
      // the chain and silently breaking tamper-detection integrity.
      return await this.prisma.$transaction(
        async (tx) => {
          const createdAt = new Date();
          let prevHash: string | null = null;
          let entryHash: string | null = null;

          if (this.hmacSecret) {
            const lastEntry = await (tx as any).auditLog.findFirst({
              where: { tenantId: data.tenantId ?? undefined },
              orderBy: { createdAt: 'desc' },
              select: { entryHash: true },
            });

            prevHash = lastEntry?.entryHash ?? null;
            entryHash = this.computeEntryHash(
              prevHash,
              data.action,
              data.resource,
              createdAt,
              data.details,
            );
          }

          const scrubbedDetails = this.scrubDetails(data.details);

          return await (tx as any).auditLog.create({
            data: {
              userId: data.userId,
              tenantId: data.tenantId,
              action: this.sanitizeString(data.action),
              resource: this.sanitizeString(data.resource),
              details: scrubbedDetails || {},
              channel: data.channel,
              ipAddress: data.ipAddress,
              correlationId,
              responseTimeMs: data.responseTimeMs,
              createdAt,
              prevHash,
              entryHash,
            } as any,
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      // Fail-safe: never crash the main request flow because of audit logging.
      this.logger.error('Audit log write failure — entry was NOT recorded', error);
    }
  }
}

