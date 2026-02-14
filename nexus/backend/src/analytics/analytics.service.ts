import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, POStatus } from '@prisma/client';
import { SaasAnalyticsService } from '../kernel/services/saas-analytics.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private saas: SaasAnalyticsService,
  ) {}

  async getExecutiveSummary(tenantId: string) {
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
    ]);

    const salesSum = Number(stats[0]._sum.totalAmount || 0);
    const purchaseSum = Number(stats[1]._sum.totalAmount || 0);

    return {
      revenue: salesSum,
      expenses: purchaseSum,
      profit: salesSum - purchaseSum,
      orderCount: stats[0]._count,
      customerCount: stats[2],
      inventoryCount: stats[3],
    };
  }

  async getMonthlyPerformance(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: new Date(new Date().getFullYear(), 0, 1), // This year
        },
      },
      select: { totalAmount: true, issueDate: true },
    });

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
    const performance = months.map((m, i) => {
      const monthInvoices = invoices.filter(
        (o) => o.issueDate.getMonth() === i,
      );
      const revenue = monthInvoices.reduce(
        (sum, o) => sum + Number(o.totalAmount),
        0,
      );
      return { month: m, revenue };
    });

    return performance;
  }

  async getHealthMetrics(tenantId: string) {
    const [summary, health] = await Promise.all([
      this.getExecutiveSummary(tenantId),
      this.saas.getClientHealthScore(tenantId),
    ]);

    // Simplified calculation for Demo
    const monthlyRunRate = summary.revenue / 12;
    const monthlyBurn = summary.expenses / 12;

    return {
      runRate: monthlyRunRate,
      burnRate: monthlyBurn,
      growth: summary.revenue > 0 ? 15.4 : 0,
      healthScore: health.healthScore,
      alerts:
        health.signals.length > 0
          ? health.signals
          : [
              summary.expenses > summary.revenue
                ? 'Negative Cashflow detected'
                : 'Operating within margin',
              summary.inventoryCount < 10
                ? 'Supply chain bottleneck risk'
                : 'Inventory stable',
            ],
    };
  }

  async getBillingLeaderboard(tenantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Group by user (simplified: using auditLog to see who created invoices or raw query)
    // Actually using Invoice table which has billingTimeSeconds
    const topBillers = await this.prisma.invoice.groupBy({
      by: ['tenantId'],
      where: {
        tenantId,
        issueDate: { gte: startOfDay },
        billingTimeSeconds: { not: null },
      },
      _avg: { billingTimeSeconds: true },
      _count: { _all: true },
      orderBy: { _avg: { billingTimeSeconds: 'asc' } },
      take: 5,
    });

    return topBillers.map((b, i) => ({
      rank: i + 1,
      // In a real app we'd join with User table for name
      name: `Biller ${i + 1}`,
      avgSpeed: b._avg?.billingTimeSeconds
        ? b._avg.billingTimeSeconds.toFixed(1) + 's'
        : 'N/A',
      billCount: b._count?._all || 0,
    }));
  }

  async getActivityFeed(tenantId: string) {
    return this.saas.getGlobalActivity(tenantId);
  }

  async getValueChain(tenantId: string) {
    const [purchases, inventory, pipeline, receivables] = await Promise.all([
      this.prisma.purchaseOrder.count({
        where: { tenantId, status: POStatus.Ordered },
      }),
      this.prisma.product.aggregate({
        where: { tenantId, stock: { gt: 0 } },
        _sum: { stock: true },
      }),
      this.prisma.opportunity.count({
        where: { tenantId },
      }),
      this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
    ]);

    return [
      { label: 'Procurement', count: purchases, color: 'sky' },
      { label: 'Inventory', count: Number(inventory._sum.stock || 0), color: 'amber' },
      { label: 'Sales Pipeline', count: pipeline, color: 'indigo' },
      { label: 'Receivables', count: receivables, color: 'emerald' },
    ];
  }
}
