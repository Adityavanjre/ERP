import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, POStatus } from '@prisma/client';
import { SaasAnalyticsService } from '../system/services/saas-analytics.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private saas: SaasAnalyticsService,
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
    ]);

    const salesSum = Number(stats[0]._sum.totalAmount || 0);
    const purchaseSum = Number(stats[1]._sum.totalAmount || 0);

    const result = {
      revenue: salesSum,
      expenses: purchaseSum,
      profit: salesSum - purchaseSum,
      orderCount: stats[0]._count,
      customerCount: stats[2],
      inventoryCount: stats[3],
    };

    await this.cacheManager.set(cacheKey, result, 300000); // 5 mins
    return result;
  }

  async getMonthlyPerformance(tenantId: string) {
    const cacheKey = `nexus:analytics:monthly_perf:${tenantId}`;
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
    const monthlySums = new Array(12).fill(0);
    for (const o of invoices) {
      monthlySums[o.issueDate.getMonth()] += Number(o.totalAmount);
    }
    const result = months.map((m, i) => ({
      month: m,
      revenue: monthlySums[i],
    }));

    await this.cacheManager.set(cacheKey, result, 300000); // 5 mins
    return result;
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
    const cacheKey = `nexus:analytics:billing_leaderboard:${tenantId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

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
    const userMap = new Map<
      string,
      { name: string; count: number; totalSpeed: number }
    >();

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

    const result = Array.from(userMap.values())
      .map((u) => ({
        name: u.name,
        billCount: u.count,
        avgSpeed:
          u.count > 0 ? (u.totalSpeed / u.count).toFixed(1) + 's' : 'N/A',
      }))
      .sort((a, b) => b.billCount - a.billCount)
      .slice(0, 5)
      .map((u, i) => ({ rank: i + 1, ...u }));

    await this.cacheManager.set(cacheKey, result, 300000); // 5 mins
    return result;
  }

  async getActivityFeed(tenantId: string) {
    return this.saas.getGlobalActivity(tenantId);
  }

  async getValueChain(tenantId: string) {
    const cacheKey = `nexus:analytics:value_chain:${tenantId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { type: true },
    });

    const type = tenant?.type || 'General';

    let result: any[] = [];

    // Define industry-specific data fetching
    if (type === 'Manufacturing') {
      const [purchases, wos, inventory, receivables] = await Promise.all([
        this.prisma.purchaseOrder.count({
          where: { tenantId, status: POStatus.Ordered },
        }),
        this.prisma.workOrder.count({
          where: { tenantId, status: { in: ['Planned', 'InProgress'] } },
        }),
        this.prisma.product.count({ where: { tenantId, stock: { gt: 0 } } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
      ]);
      result = [
        { label: 'Procurement', count: purchases, color: 'sky' },
        { label: 'Work Orders', count: wos, color: 'amber' },
        { label: 'Stock Level', count: inventory, color: 'indigo' },
        { label: 'Receivables', count: receivables, color: 'emerald' },
      ];
    } else if (type === 'Construction') {
      const [projects, materialPO, siteInventory, receivables] =
        await Promise.all([
          this.prisma.project.count({
            where: { tenantId, status: { in: ['Active', 'Planned'] } },
          }),
          this.prisma.purchaseOrder.count({
            where: { tenantId, status: POStatus.Ordered },
          }),
          this.prisma.product.count({ where: { tenantId, stock: { gt: 0 } } }),
          this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
        ]);
      result = [
        { label: 'Active Projects', count: projects, color: 'sky' },
        { label: 'Site Orders', count: materialPO, color: 'amber' },
        { label: 'Site Stock', count: siteInventory, color: 'indigo' },
        { label: 'Receivables', count: receivables, color: 'emerald' },
      ];
    } else if (type === 'Wholesale' || type === 'Retail') {
      const [po, stock, customers, receivables] = await Promise.all([
        this.prisma.purchaseOrder.count({
          where: { tenantId, status: POStatus.Ordered },
        }),
        this.prisma.product.aggregate({
          where: { tenantId },
          _sum: { stock: true },
        }),
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
      ]);
      result = [
        { label: 'Inbound POs', count: po, color: 'sky' },
        {
          label: 'Total Stock',
          count: Number(stock._sum.stock || 0),
          color: 'amber',
        },
        { label: 'Active Leads', count: customers, color: 'indigo' },
        { label: 'Receivables', count: receivables, color: 'emerald' },
      ];
    } else if (type === 'Healthcare') {
      const [appointments, patients, records, billing] = await Promise.all([
        this.prisma.appointment.count({ where: { tenantId } }),
        this.prisma.patient.count({ where: { tenantId } }),
        this.prisma.medicalRecord.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
      ]);
      result = [
        { label: 'Appointments', count: appointments, color: 'sky' },
        { label: 'Total Patients', count: patients, color: 'amber' },
        { label: 'Med Records', count: records, color: 'indigo' },
        { label: 'Billing Due', count: billing, color: 'emerald' },
      ];
    } else if (type === 'Logistics') {
      const [vehicles, routes, fuel, delivery] = await Promise.all([
        this.prisma.vehicle.count({ where: { tenantId } }),
        this.prisma.routeLog.count({ where: { tenantId } }),
        this.prisma.fuelLog.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
      ]);
      result = [
        { label: 'Fleet Size', count: vehicles, color: 'sky' },
        { label: 'Active Routes', count: routes, color: 'amber' },
        { label: 'Fuel Entries', count: fuel, color: 'indigo' },
        { label: 'Open Invoices', count: delivery, color: 'emerald' },
      ];
    } else if (type === 'NBFC') {
      const [loans, emis, kyc, reconciliations] = await Promise.all([
        this.prisma.loan.count({ where: { tenantId } }),
        this.prisma.eMISchedule.count({ where: { tenantId } }),
        this.prisma.kYCRecord.count({ where: { tenantId } }),
        this.prisma.bankReconciliation.count({ where: { tenantId } }),
      ]);
      result = [
        { label: 'Active Loans', count: loans, color: 'sky' },
        { label: 'Pending EMIs', count: emis, color: 'amber' },
        { label: 'KYC Files', count: kyc, color: 'indigo' },
        { label: 'Bank Recs', count: reconciliations, color: 'emerald' },
      ];
    } else if (type === 'Education') {
      const [students, invoices, depts, supplies] = await Promise.all([
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
        this.prisma.department.count({ where: { tenantId } }),
        this.prisma.product.count({ where: { tenantId, stock: { gt: 0 } } }),
      ]);
      result = [
        { label: 'Enrollment', count: students, color: 'sky' },
        { label: 'Fee Receivables', count: invoices, color: 'amber' },
        { label: 'Academic Depts', count: depts, color: 'indigo' },
        { label: 'Supply Stock', count: supplies, color: 'emerald' },
      ];
    } else if (type === 'RealEstate' || type === 'Service') {
      const [projects, leads, ops, receivables] = await Promise.all([
        this.prisma.project.count({ where: { tenantId } }),
        this.prisma.customer.count({ where: { tenantId, status: 'Lead' } }),
        this.prisma.opportunity.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
      ]);
      result = [
        { label: 'Active Projects', count: projects, color: 'sky' },
        { label: 'Total Leads', count: leads, color: 'amber' },
        { label: 'Sales Pipeline', count: ops, color: 'indigo' },
        { label: 'Receivables', count: receivables, color: 'emerald' },
      ];
    } else if (type === 'Gov') {
      const [depts, po, inventory, receivables] = await Promise.all([
        this.prisma.department.count({ where: { tenantId } }),
        this.prisma.purchaseOrder.count({ where: { tenantId } }),
        this.prisma.product.count({ where: { tenantId, stock: { gt: 0 } } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
      ]);
      result = [
        { label: 'Divisions', count: depts, color: 'sky' },
        { label: 'Procurement', count: po, color: 'amber' },
        { label: 'Public Assets', count: inventory, color: 'indigo' },
        { label: 'Revenue Streams', count: receivables, color: 'emerald' },
      ];
    } else {
      // Default: General
      const [purchases, inventory, pipeline, receivables] = await Promise.all([
        this.prisma.purchaseOrder.count({
          where: { tenantId, status: POStatus.Ordered },
        }),
        this.prisma.product.count({ where: { tenantId, stock: { gt: 0 } } }),
        this.prisma.opportunity.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId, status: 'Unpaid' } }),
      ]);

      result = [
        { label: 'Procurement', count: purchases, color: 'sky' },
        { label: 'Inventory Items', count: inventory, color: 'amber' },
        { label: 'Sales Pipeline', count: pipeline, color: 'indigo' },
        { label: 'Receivables', count: receivables, color: 'emerald' },
      ];
    }

    await this.cacheManager.set(cacheKey, result, 300000); // 5 mins
    return result;
  }
}
