import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async generateKey(
    tenantId: string,
    name: string,
    scopes: string[],
    data: { quotaLimit?: number } = {},
  ) {
    const prefix = 'klp_' + crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(24).toString('hex');
    const fullKey = `${prefix}.${secret}`;
    const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');

    await this.prisma.apiKey.create({
      data: {
        tenantId,
        name,
        key: hashedKey,
        prefix,
        scopes: scopes || [],
        quotaLimit: data.quotaLimit || null,
      },
    });

    await this.audit.log({
      tenantId,
      action: 'API_KEY_GENERATED',
      resource: `ApiKey:${prefix}`,
      details: { name, scopes, quotaLimit: data.quotaLimit },
    });

    return { key: fullKey }; // Plain key returned ONLY ONCE
  }

  async validateKey(key: string) {
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    const keyRecord = await this.prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: { tenant: true },
    });

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API Key');
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('API Key Expired');
    }

    // 1. Quota Enforcement
    if (keyRecord.quotaLimit && keyRecord.usageCount >= keyRecord.quotaLimit) {
      throw new UnauthorizedException('API Key Quota Exceeded');
    }

    // 2. Atomic Rate Limiting: single conditional update prevents the race condition
    // where two concurrent requests both pass the read-check before either write completes.
    const now = new Date();
    const oneSecondAgo = new Date(now.getTime() - 1000);
    const updateResult = await this.prisma.apiKey.updateMany({
      where: {
        id: keyRecord.id,
        OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: oneSecondAgo } }],
      },
      data: {
        lastUsedAt: now,
        usageCount: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      throw new UnauthorizedException('Rate limit exceeded: 1 req/sec');
    }

    return keyRecord;
  }

  async getKeys(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revokeKey(id: string, tenantId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id, tenantId },
      select: { prefix: true },
    });

    if (key) {
      await this.audit.log({
        tenantId,
        action: 'API_KEY_REVOKED',
        resource: `ApiKey:${key.prefix}`,
      });
    }

    return this.prisma.apiKey.delete({
      where: { id, tenantId },
    });
  }
}
