import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { ForecastingService } from './forecasting.service';

export interface HealthReport {
  tenantId: string;
  healthScore: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
  signals: string[];
  metrics: any;
  interventions: any;
}

@Injectable()
export class SaasAnalyticsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private forecasting: ForecastingService,
  ) {}

  async getCashflowProjections(tenantId: string) {
    return this.forecasting.getCashflowForecast(tenantId);
  }

  async getGlobalActivity(tenantId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { fullName: true } } },
    });

    return logs.map((log) => {
      let message = `${log.action} on ${log.resource}`;
      const details = log.details as any;

      if (log.action === 'POST' && log.resource.includes('/sales')) {
        message = `New Sale: Invoice #${details?.body?.invoiceNumber || 'Draft'} generated`;
      } else if (log.action === 'POST' && log.resource.includes('/inventory')) {
        message = `Stock Update: ${details?.body?.name || 'Item'} added to inventory`;
      } else if (log.action === 'POST' && log.resource.includes('/crm')) {
        message = `New Lead: ${details?.body?.firstName} ${details?.body?.lastName || ''} registered`;
      } else if (log.action === 'POST' && log.resource.includes('/purchases')) {
        message = `Procurement: Purchase Order #${details?.body?.orderNumber} issued`;
      }

      return {
        id: log.id,
        user: log.user?.fullName || 'System',
        message,
        time: log.createdAt,
        resource: log.resource,
      };
    });
  }

  async getClientHealthScore(tenantId: string): Promise<HealthReport> {
    const cacheKey = `health_score_${tenantId}`;
    const cached = await this.cacheManager.get<HealthReport>(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      invoiceStats,
      activityPulse,
      lastAction,
      recentInvoices,
      ownerLogin,
      periodLock,
    ] = await Promise.all([
      // 1. Efficient Payment Aggregation
      this.prisma.invoice.aggregate({
        where: { tenantId },
        _count: { id: true },
        _sum: { amountPaid: true, totalAmount: true },
      }),
      // 2. Activity Pulse (Last 24h)
      this.prisma.auditLog.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      // 3. Last Login/Action
      this.prisma.auditLog.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      }),
      // 4. Recent Invoices for Entry Lag
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          action: 'INVOICE_CREATED',
          createdAt: { gte: today },
        },
        select: { details: true },
      }),
      // 5. Owner Login (Checking if any login occurred in last 3 days)
      this.prisma.auditLog.findFirst({
        where: {
          tenantId,
          action: { contains: 'LOGIN' },
          createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        },
      }),
      // 6. Period Lock status
      (this.prisma as any).periodLock.findFirst({
        where: { tenantId, month: today.getMonth() + 1, year: today.getFullYear() }
      })
    ]);

    // Safety for Zero Data
    if (!invoiceStats || (invoiceStats._count.id === 0 && !lastAction)) {
        return {
            tenantId,
            healthScore: 100,
            status: 'GREEN',
            signals: ['NEW_TENANT: Waiting for initial data pulse'],
            metrics: { paymentRatio: 0, activityPulse: 0 },
            interventions: []
        };
    }

    const adjustments = await this.prisma.auditLog.count({
      where: {
        tenantId,
        action: 'STOCK_ADJUSTMENT',
        createdAt: { gte: today },
      },
    });

    // Calculate Metrics
    const totalAmount = Number(invoiceStats._sum.totalAmount || 0);
    const amountPaid = Number(invoiceStats._sum.amountPaid || 0);
    const taggingRatio =
      totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 100;

    const lags = recentInvoices.map(
      (log: any) => log.details?.entryLagMinutes || 0,
    );
    const avgLag =
      lags.length > 0
        ? Math.floor(
            lags.reduce((a: number, b: number) => a + b, 0) / lags.length,
          )
        : 0;

    // Behavioral Risk Formula (Score 0-100)
    let riskScore = 0;
    const signals = [];

    // R1: 48h No Billing Consistency
    if (
      !lastAction ||
      Date.now() - lastAction.createdAt.getTime() > 48 * 60 * 60 * 1000
    ) {
      riskScore += 50;
      signals.push('SILENT_CHURN: No transaction activity for 48h');
    }

    // R2: Entry Lag (Low Discipline)
    if (avgLag > 120) {
      // 2 Hours
      riskScore += 25;
      signals.push(
        `DISCIPLINE_LAG: Entry lag is ${avgLag} mins. Risk of data inaccuracy.`,
      );
    }

    // R3: Owner Login Missing (3 Days)
    if (!ownerLogin) {
      riskScore += 30;
      signals.push(
        'OWNER_ABSENT: No owner login in last 3 days. Management drift likely.',
      );
    }

    // R4: High Manual Stock Adjustments
    if (adjustments > 5) {
      riskScore += 20;
      signals.push(
        'INVENTORY_DRIFT: Unusual frequency of manual stock adjustments.',
      );
    }

    // R5: Low Payment Tagging
    if (taggingRatio < 50 && totalAmount > 1000) {
      riskScore += 15;
      signals.push(
        `CASHFLOW_RISK: Payment tagging ratio is low at ${taggingRatio.toFixed(0)}%.`,
      );
    }

    // R6: No Period Lock Used
    if (!periodLock) {
      riskScore += 10;
      signals.push(
        'COMPLIANCE_RISK: Previous month not locked. Audit trail vulnerable.',
      );
    }

    const healthScore = Math.max(0, 100 - riskScore);
    const status =
      healthScore >= 70 ? 'GREEN' : healthScore >= 40 ? 'YELLOW' : 'RED';

    const result: HealthReport = {
      tenantId,
      healthScore,
      status,
      signals,
      metrics: {
        dailyActions: activityPulse, // Using the correct variable name
        avgEntryLag: avgLag,
        taggingRatio: taggingRatio.toFixed(1) + '%',
        todayAdjustments: adjustments,
        lastSeen: lastAction?.createdAt || null,
        periodLockStatus: periodLock ? 'Locked' : 'Vulnerable',
      },
      interventions: this.getInterventionStrategy(status, healthScore),
    };

    // Cache for 5 minutes (300,000ms)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  private getInterventionStrategy(status: string, score: number) {
    if (status === 'RED') {
      return {
        action: 'SCHEDULE_SUPPORT_CALL',
        channel: 'WHATSAPP_FOUNDER',
        template:
          "Action Required: The client's discipline score has dropped to RED. Scheduling mandatory recovery call.",
      };
    } else if (status === 'YELLOW') {
      return {
        action: 'SEND_TRAINING_VIDEO',
        channel: 'WHATSAPP_USER',
        template:
          'Did you know? Locking your month prevents data drift. Watch this 2-min guide to stay Green!',
      };
    } else if (score >= 95) {
      return {
        action: 'ANNUAL_UPGRADE_PROMO',
        channel: 'UI_MODAL',
        template:
          'You are an Elite User! Unlock 20% savings by switching to our Annual Plan today.',
      };
    }
    return null;
  }

  async getStaffLeaderboard(tenantId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        action: 'INVOICE_CREATED',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      include: { user: { select: { fullName: true, email: true } } },
    });

    const userStats = new Map<
      string,
      { name: string; count: number; totalLag: number }
    >();

    for (const log of logs) {
      const userName = log.user?.fullName || log.user?.email || 'System';
      const lag = (log.details as any)?.entryLagMinutes || 0;

      const existing = userStats.get(userName) || {
        name: userName,
        count: 0,
        totalLag: 0,
      };
      existing.count++;
      existing.totalLag += lag;
      userStats.set(userName, existing);
    }

    return Array.from(userStats.values())
      .map((u) => ({
        name: u.name,
        invoices: u.count,
        avgLag: Math.round(u.totalLag / u.count),
      }))
      .sort((a, b) => b.invoices - a.invoices);
  }

  async getRecoveryMemory(tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [payments, invoices, stockAdjustments, dormantRaw] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: { tenantId, date: { gte: thirtyDaysAgo } },
          include: { invoice: true },
        }),
        this.prisma.invoice.findMany({
          where: { tenantId, issueDate: { gte: thirtyDaysAgo } },
        }),
        this.prisma.auditLog.count({
          where: {
            tenantId,
            action: 'STOCK_ADJUSTMENT',
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.customer.findMany({
          where: {
            tenantId,
            isDeleted: false,
            invoices: {
              some: { issueDate: { lt: thirtyDaysAgo, gte: sixtyDaysAgo } },
              none: { issueDate: { gte: thirtyDaysAgo } },
            },
          },
          include: { invoices: { orderBy: { issueDate: 'desc' }, take: 1 } },
        }),
      ]);

    // 1. Money Recovered (Payments on Overdue Invoices)
    const overdueRecovered = payments
      .filter((p) => p.invoice && p.invoice.dueDate < p.date)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // 2. Collection Efficiency
    const lags = payments
      .filter((p) => p.invoice)
      .map(
        (p) =>
          (p.date.getTime() - p.invoice!.issueDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

    const avgLagCurrent =
      lags.length > 0 ? lags.reduce((a, b) => a + b, 0) / lags.length : 22;
    const baselineLag = 45; // Industry benchmark for manual processes
    const improvement = ((baselineLag - avgLagCurrent) / baselineLag) * 100;

    // 3. Time Saved (15 mins per transaction automation)
    const totalTransactions = invoices.length + payments.length;
    const hoursSaved = (totalTransactions * 15) / 60;

    // 4. Shrinkage Avoided (Proxy: ₹500 per stock audit adjustment caught)
    const shrinkageAvoided = stockAdjustments * 500;

    // 5. Recovery Opportunities (Dormant Customers)
    const recoveryOpportunities = dormantRaw.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName || ''}`.trim(),
      lastTransaction: Number(c.invoices[0]?.totalAmount || 0),
      daysSilent: Math.floor(
        (Date.now() - c.invoices[0]?.issueDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));

    const totalMoneyFound =
      overdueRecovered + invoices.length * 50 + shrinkageAvoided;

    return {
      moneyFound: {
        total: totalMoneyFound,
        overdueRecovered,
        disputesPrevented: invoices.length * 50, // Value of clean digital trail
        shrinkageAvoided,
      },
      efficiency: {
        avgPaymentLag: Math.round(avgLagCurrent),
        baselineLag,
        improvement: Math.round(improvement),
      },
      timeSaved: {
        hours: Math.round(hoursSaved),
        monetaryValue: Math.round(hoursSaved * 250), // Assuming ₹250/hr admin cost
      },
      anchors: {
        monthlyProtection: totalMoneyFound,
        lifetimeRecovery: totalMoneyFound * 6.5, // 6.5 months avg user age simulation
        daysSinceDrift: 14, // Simulated safety streak
      },
      opportunities: recoveryOpportunities,
    };
  }

  async getFounderDashboard() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true, plan: true },
    });

    // OPTIMIZATION: Process in chunks or parallel with concurrency limit if N > 10
    const reports = await Promise.all(
      tenants.map(async (t: any) => {
        // Fetch from cache ONLY if possible to keep dashboard snappy
        const cacheKey = `health_score_${t.id}`;
        const cached = await this.cacheManager.get<HealthReport>(cacheKey);
        
        if (cached) {
            return {
                tenantName: t.name,
                plan: t.plan,
                mrr: this.getMRR(t.plan),
                healthScore: cached.healthScore,
                status: cached.status,
                signals: cached.signals,
            };
        }

        // If not cached, we return a "Pending" state instead of blocking the whole dashboard
        // A background job should ideally populate these.
        return {
          tenantName: t.name,
          plan: t.plan,
          mrr: this.getMRR(t.plan),
          healthScore: 0,
          status: 'GRAY',
          signals: ['CALCULATING: Check back in 5 mins'],
        };
      }),
    );

    const mrrAtRisk = reports
      .filter((r: any) => r.status === 'RED')
      .reduce((sum, r) => sum + r.mrr, 0);

    const topAtRisk = reports
      .filter((r: any) => r.status !== 'GREEN' && r.status !== 'GRAY')
      .sort((a, b: any) => a.healthScore - b.healthScore)
      .slice(0, 5);

    return {
      totalTenants: reports.length,
      mrrAtRisk,
      systemHealth:
        reports.length > 0
          ? Math.round(
              reports.reduce((sum, r) => sum + r.healthScore, 0) /
                reports.length,
            )
          : 0,
      topAtRisk,
      allReports: reports,
    };
  }

  private getMRR(plan: string): number {
    const mrrMap: any = { Free: 0, Lite: 999, Pro: 2499, Enterprise: 9999 };
    return mrrMap[plan] || 0;
  }
}
