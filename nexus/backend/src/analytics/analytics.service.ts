import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, POStatus } from '@prisma/client';
import { SaasAnalyticsService } from '../system/services/saas-analytics.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private saas: SaasAnalyticsService,
  ) { }

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
    // ANALYTICS-001: Original grouped by tenantId — returned one row (useless).
    // Correct approach: read AuditLog for INVOICE_CREATED actions today and aggregate by user.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        action: 'INVOICE_CREATED',
        createdAt: { gte: startOfDay },
      },
      include: { user: { select: { fullName: true, email: true } } },
    });

    // Aggregate per user
    const userMap = new Map<string, { name: string; count: number; totalSpeed: number }>();

    for (const log of logs) {
      const key = log.userId ?? 'system';
      const name = log.user?.fullName || log.user?.email || 'System';
      const details = log.details as any;
      const speed = details?.billingTimeSeconds ?? 0;

      const existing = userMap.get(key) ?? { name, count: 0, totalSpeed: 0 };
      existing.count += 1;
      existing.totalSpeed += Number(speed);
      userMap.set(key, existing);
    }

    return Array.from(userMap.values())
      .map((u) => ({
        name: u.name,
        billCount: u.count,
        avgSpeed: u.count > 0 ? (u.totalSpeed / u.count).toFixed(1) + 's' : 'N/A',
      }))
      .sort((a, b) => b.billCount - a.billCount)
      .slice(0, 5)
      .map((u, i) => ({ rank: i + 1, ...u }));
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
