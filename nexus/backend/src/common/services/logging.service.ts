import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LoggingService {
  constructor(private prisma: PrismaService) { }

  async log(data: {
    userId?: string;
    tenantId?: string;
    action: string;
    resource: string;
    details?: any;
    channel?: string;
    ipAddress?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          tenantId: data.tenantId,
          action: data.action,
          resource: data.resource,
          details: data.details || {},
          channel: data.channel,
          ipAddress: data.ipAddress,
        },
      });
    } catch (error) {
      // Fail-safe: don't crash the main flow if logging fails
      console.error('Audit log failure:', error);
    }
  }
}
