import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

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
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          details: data.details || {},
          ipAddress: data.ipAddress,
        },
      });
    } catch (err) {
      this.logger.error('CRITICAL: Audit logging failed', err.stack);
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
   * Prunes logs older than 90 days to prevent table explosion.
   * Suggested Trigger: Monthly maintenance or CRON.
   */
  async pruneOldLogs() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    this.logger.log(
      `Pruned ${result.count} audit log entries older than 90 days.`,
    );
    return result.count;
  }
}
