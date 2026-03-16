import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, POStatus } from '@prisma/client';
import { SaasAnalyticsService } from '../system/services/saas-analytics.service';
import { TenantContextService } from '../prisma/tenant-context.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private saas: SaasAnalyticsService,
    private tenantContext: TenantContextService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getExecutiveSummary(tenantId: string) {
    const cacheKey = `nexus:analytics:exec_summary:${tenantId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const stats = await Promise.all([
      // Sales Total (Invoices)
      this.prisma.invoice.aggregate({
        where: { tenantId },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Purchases Total (Purchase Orders)
      this.prisma.purchaseOrder.aggregate({
        where: { tenantId, status: POStatus.Received },
        _sum: { totalAmount: true },
      }),
      // CRM Total
      this.prisma.customer.count({ where: { tenantId } }),
      // Inventory Total
      this.prisma.product.count({ where: { tenantId } }),
      // Manufacturing Total
      this.prisma.workOrder.count({ where: { tenantId } }),
    ]);

    const result = {
      revenue: Number(stats[0]._sum.totalAmount || 0),
      expenses: Number(stats[1]._sum.totalAmount || 0),
      profit:
        Number(stats[0]._sum.totalAmount || 0) -
        Number(stats[1]._sum.totalAmount || 0),
      orderCount: stats[0]._count,
      customerCount: stats[2],
      inventoryCount: stats[3],
      workOrderCount: stats[4],
    };

    await this.cacheManager.set(cacheKey, result, 300000); // 5 mins
    return result;
  }

  async getMonthlyPerformance(tenantId: string) {
    const cacheKey = `nexus:analytics:performance:${tenantId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: new Date(new Date().getFullYear(), 0, 1), // This year
        },
      },
      select: { totalAmount: true, issueDate: true },
    });

    const monthlySales: Record<string, number> = {};
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    months.forEach((m) => (monthlySales[m] = 0));

    invoices.forEach((inv) => {
      const monthIdx = new Date(inv.issueDate).getMonth();
      const monthName = months[monthIdx];
      monthlySales[monthName] += Number(inv.totalAmount);
    });

    const result = Object.entries(monthlySales).map(([name, revenue]) => ({
      name,
      revenue,
    }));

    await this.cacheManager.set(cacheKey, result, 300000); // 5 mins
    return result;
  }

  async getHealthMetrics(tenantId: string) {
    const [summary, health] = await Promise.all([
      this.getExecutiveSummary(tenantId),
      this.saas.getClientHealthScore(tenantId),
    ]);

    const monthlyRunRate = summary.revenue / 12;
    const monthlyBurn = summary.expenses / 12;

    return {
      runRate: Math.round(monthlyRunRate),
      burnRate: Math.round(monthlyBurn),
      growth: health.metrics?.growth || 0,
      healthScore: health.healthScore,
      alerts: health.signals,
    };
  }

  async getActivityFeed(tenantId: string) {
    return this.saas.getGlobalActivity(tenantId);
  }

  async getDashboardOverview(tenantId: string) {
    const cacheKey = `nexus:analytics:dashboard_overview:${tenantId}`;
    try {
      const cached = await this.cacheManager
        .get<any>(cacheKey)
        .catch(() => null);
      if (cached) return cached;
    } catch {
      /* Ignore */
    }

    const [summary, performance, health, activity, valueChain] =
      await Promise.all([
        this.getExecutiveSummary(tenantId).catch(() => ({
          revenue: 0,
          expenses: 0,
          profit: 0,
          orderCount: 0,
          customerCount: 0,
          inventoryCount: 0,
          workOrderCount: 0,
        })),
        this.getMonthlyPerformance(tenantId).catch(() => []),
        this.getHealthMetrics(tenantId).catch(() => ({
          runRate: 0,
          burnRate: 0,
          growth: 0,
          healthScore: 100,
          alerts: [],
        })),
        this.getActivityFeed(tenantId).catch(() => []),
        this.getValueChain(tenantId).catch(() => []),
      ]);

    const result = { summary, performance, health, activity, valueChain };
    try {
      await this.cacheManager.set(cacheKey, result, 30000).catch(() => null);
    } catch {
      /* Ignore */
    }
    return result;
  }

  async getValueChain(tenantId: string) {
    const cacheKey = `nexus:analytics:value_chain:${tenantId}`;
    try {
      const cached = await this.cacheManager
        .get<any>(cacheKey)
        .catch(() => null);
      if (cached) return cached;
    } catch {
      /* Ignore */
    }

    const tenant = await this.prisma.tenant
      .findUnique({
        where: { id: tenantId },
        select: { type: true, industry: true },
      })
      .catch(() => null);

    const type = tenant?.industry || tenant?.type || 'General';
    let result: any[] = [];

    if (type === 'Manufacturing') {
      const [
        purchases,
        wos,
        inventory,
        receivables,
        mfgWip,
        lowStockMaterials,
      ] = await Promise.all([
        this.prisma.purchaseOrder
          .count({ where: { tenantId, status: POStatus.Ordered } })
          .catch(() => 0),
        this.prisma.workOrder
          .count({
            where: { tenantId, status: { in: ['Planned', 'InProgress'] } },
          })
          .catch(() => 0),
        this.prisma.product
          .count({ where: { tenantId, stock: { gt: 0 } } })
          .catch(() => 0),
        this.prisma.invoice
          .count({ where: { tenantId, status: 'Unpaid' } })
          .catch(() => 0),
        this.prisma.workOrder
          .count({
            where: { tenantId, status: { in: ['Planned', 'InProgress'] } },
          })
          .catch(() => 0),
        this.prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*)::int as count 
            FROM "Product" 
            WHERE "tenantId" = ${tenantId} 
              AND "isService" = false 
              AND "stock" <= "minStockLevel"
              AND "isDeleted" = false
          `
          .then((res) => Number(res?.[0]?.count || 0))
          .catch(() => 0),
      ]);
      result = [
        { label: 'Procurement', count: purchases, color: 'sky' },
        { label: 'Work Orders', count: wos, color: 'amber' },
        { label: 'Stock Level', count: inventory, color: 'indigo' },
        { label: 'Receivables', count: receivables, color: 'emerald' },
        { label: 'Mfg WIP', count: mfgWip, color: 'purple' },
        { label: 'Low Stock', count: lowStockMaterials, color: 'red' },
      ];
    } else {
      // Simple General fallback
      const [purchases, inventory, pipeline, receivables] = await Promise.all([
        this.prisma.purchaseOrder
          .count({ where: { tenantId, status: POStatus.Ordered } })
          .catch(() => 0),
        this.prisma.product
          .count({ where: { tenantId, stock: { gt: 0 } } })
          .catch(() => 0),
        this.prisma.opportunity.count({ where: { tenantId } }).catch(() => 0),
        this.prisma.invoice
          .count({ where: { tenantId, status: 'Unpaid' } })
          .catch(() => 0),
      ]);
      result = [
        { label: 'Procurement', count: purchases, color: 'sky' },
        { label: 'Inventory', count: inventory, color: 'amber' },
        { label: 'Sales Pipeline', count: pipeline, color: 'indigo' },
        { label: 'Receivables', count: receivables, color: 'emerald' },
      ];
    }

    try {
      await this.cacheManager.set(cacheKey, result, 300000).catch(() => null);
    } catch {
      /* Ignore */
    }
    return result;
  }

  async runDiagnostics(tenantId: string) {
    const contextId = this.tenantContext.getTenantId();
    const [invCount, prodCount, custCount, woCount] = await Promise.all([
      this.prisma.invoice.count({ where: { tenantId } }).catch(() => -1),
      this.prisma.product.count({ where: { tenantId } }).catch(() => -1),
      this.prisma.customer.count({ where: { tenantId } }).catch(() => -1),
      this.prisma.workOrder.count({ where: { tenantId } }).catch(() => -1),
    ]);

    return {
      timestamp: new Date().toISOString(),
      tenantIdInToken: tenantId,
      tenantIdInContext: contextId,
      match: tenantId === contextId,
      visibleData: {
        invoices: invCount,
        products: prodCount,
        customers: custCount,
        workOrders: woCount,
      },
    };
  }
}
