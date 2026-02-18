import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanType } from '@prisma/client';

export interface PlanQuotas {
  maxUsers: number;
  maxProducts: number;
  maxInvoices: number;
  aiEnabled: boolean;
  prioritySupport: boolean;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  private readonly QUOTAS: Record<PlanType, PlanQuotas> = {
    [PlanType.Free]: {
      maxUsers: 5,
      maxProducts: 50,
      maxInvoices: 20,
      aiEnabled: false,
      prioritySupport: false,
    },
    [PlanType.Pro]: {
      maxUsers: 50,
      maxProducts: 2000,
      maxInvoices: 500,
      aiEnabled: true,
      prioritySupport: true,
    },
    [PlanType.Enterprise]: {
      maxUsers: 9999,
      maxProducts: 999999,
      maxInvoices: 999999,
      aiEnabled: true,
      prioritySupport: true,
    },
  };

  constructor(private prisma: PrismaService) {}

  async getTenantPlan(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, name: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    return {
      plan: tenant.plan,
      quotas: this.QUOTAS[tenant.plan],
    };
  }

  async validateQuota(tenantId: string, resource: keyof PlanQuotas) {
    const { plan, quotas } = await this.getTenantPlan(tenantId);

    // Example check for products
    if (resource === 'maxProducts') {
      const count = await this.prisma.product.count({ where: { tenantId } });
      if (count >= quotas.maxProducts) {
        throw new ForbiddenException(
          `Quota exceeded: Plan [${plan}] only allows ${quotas.maxProducts} products.`,
        );
      }
    }

    // Example check for AI
    if (resource === 'aiEnabled' && !quotas.aiEnabled) {
      throw new ForbiddenException(
        `AI Features are disabled for your current [${plan}] plan. Upgrade to Pro/Enterprise.`,
      );
    }

    return true;
  }

  async upgradePlan(tenantId: string, newPlan: PlanType) {
    this.logger.log(`Billing: Upgrading Tenant [${tenantId}] to [${newPlan}]`);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: newPlan },
    });
  }

  async getBillingStatement(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { issueDate: 'desc' },
      take: 12,
    });

    return {
      invoices,
      estimatedNextBill: '2026-03-01',
      currency: 'USD',
    };
  }
}
