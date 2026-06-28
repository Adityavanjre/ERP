import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface PushChange {
  table: string;
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  clientTimestamp: string;
}

export interface PushResult {
  id: string;
  status: 'ok' | 'conflict' | 'error';
  serverData?: Record<string, unknown>;
  error?: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  private readonly TABLE_MAP: Record<string, string> = {
    products: 'product',
    suppliers: 'supplier',
    customers: 'customer',
    purchase_orders: 'purchaseOrder',
    stock_movements: 'stockMovement',
  };

  constructor(private prisma: PrismaService) {}

  async push(tenantId: string, changes: PushChange[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const change of changes) {
      try {
        const result = await this.applyChange(tenantId, change);
        results.push(result);
      } catch (err: any) {
        results.push({ id: change.id, status: 'error', error: err.message });
      }
    }

    return results;
  }

  private async applyChange(
    tenantId: string,
    change: PushChange,
  ): Promise<PushResult> {
    const { table, id, operation, data, clientTimestamp } = change;
    const model = this.TABLE_MAP[table];
    if (!model)
      return { id, status: 'error', error: `Unknown table: ${table}` };

    const prismaModel = (this.prisma as any)[model];
    if (!prismaModel)
      return { id, status: 'error', error: `Model not found: ${model}` };

    if (operation === 'INSERT' || operation === 'UPDATE') {
      const existing = await prismaModel.findFirst({ where: { id, tenantId } });

      if (existing) {
        const serverModified = new Date(
          existing.updatedAt || existing.createdAt,
        );
        const clientModified = new Date(clientTimestamp);

        if (clientModified < serverModified) {
          return {
            id,
            status: 'conflict',
            serverData: this.serializeRecord(existing),
          };
        }

        const updateData = this.prepareUpdateData(data, tenantId);
        await prismaModel.updateMany({
          where: { id, tenantId },
          data: updateData,
        });
        return { id, status: 'ok' };
      } else {
        const createData = this.prepareCreateData(data, tenantId);
        await prismaModel.create({ data: { ...createData, id, tenantId } });
        return { id, status: 'ok' };
      }
    }

    if (operation === 'DELETE') {
      const existing = await prismaModel.findFirst({ where: { id, tenantId } });
      if (!existing) return { id, status: 'ok' };

      if ('isDeleted' in existing) {
        await prismaModel.updateMany({
          where: { id, tenantId },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }
      return { id, status: 'ok' };
    }

    return { id, status: 'error', error: `Unknown operation: ${operation}` };
  }

  async pull(
    tenantId: string,
    since: string,
    tables: string[],
  ): Promise<Record<string, Record<string, unknown>[]>> {
    const result: Record<string, Record<string, unknown>[]> = {};
    const sinceDate = new Date(since);

    for (const table of tables) {
      const model = this.TABLE_MAP[table];
      if (!model) continue;

      const prismaModel = (this.prisma as any)[model];
      if (!prismaModel) continue;

      const records = await prismaModel.findMany({
        where: {
          tenantId,
          updatedAt: { gt: sinceDate },
        },
        orderBy: { updatedAt: 'asc' },
        take: 500,
      });

      result[table] = records.map((r: any) => this.serializeRecord(r));
    }

    return result;
  }

  async getStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, updatedAt: true },
    });

    return {
      serverTime: new Date().toISOString(),
      tenantName: tenant?.name,
      tables: Object.keys(this.TABLE_MAP),
    };
  }

  async trackAnalytics(
    tenantId: string,
    userId: string,
    event: {
      eventType: string;
      eventName: string;
      metadata?: Record<string, unknown>;
      sessionId?: string;
      platform?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.billingEvent.create({
        data: {
          tenantId,
          event: event.eventName,
          performedBy: userId,
          metadata: {
            eventType: event.eventType,
            ...event.metadata,
            sessionId: event.sessionId,
            platform: event.platform,
            source: 'client_analytics',
          } as any,
        },
      });
    } catch {
      // Analytics ingestion should never block
    }
  }

  async getMetadata(tenantId: string, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true },
    });

    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { permissions: true },
    });

    return {
      modules: tenant?.enabledModules || [],
      permissions: tenantUser?.permissions || {},
    };
  }

  async pushAuditLogs(tenantId: string, userId: string, logs: any[]) {
    if (!logs || logs.length === 0) return { inserted: 0 };
    
    const auditData = logs.map(log => ({
      tenantId,
      userId,
      action: log.action || 'UNKNOWN',
      resource: log.resource || 'UNKNOWN',
      details: log.details ? JSON.parse(log.details) : null,
      status: log.status,
      errorMessage: log.error_message,
      createdAt: new Date(log.created_at || Date.now()),
    }));

    await this.prisma.auditLog.createMany({
      data: auditData,
    });

    return { inserted: auditData.length };
  }

  private prepareCreateData(
    data: Record<string, unknown>,
    tenantId: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { tenantId };
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      if (key === 'id' || key === 'tenantId') continue;
      result[this.snakeToCamel(key)] = value;
    }
    return result;
  }

  private prepareUpdateData(
    data: Record<string, unknown>,
    tenantId: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      if (key === 'id' || key === 'tenantId') continue;
      result[this.snakeToCamel(key)] = value;
    }
    return result;
  }

  private serializeRecord(record: any): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (value instanceof Decimal) {
        result[key] = value.toNumber();
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
