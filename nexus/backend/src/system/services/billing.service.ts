import {
  Injectable,
  ForbiddenException,
  GoneException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanType, SubscriptionStatus, Prisma } from '@prisma/client';
import { LoggingService } from '../../common/services/logging.service';

// ---------------------------------------------------------------------------
// Plan quota definitions — Indian market aligned
// ---------------------------------------------------------------------------
export interface PlanQuotas {
  maxUsers: number; // Staff seats (Owner + staff)
  maxCaSeats: number; // Read-only CA/accountant seats (no billing cost)
  maxProducts: number; // SKUs / inventory items
  maxInvoicesPerMonth: number; // Sales invoices per calendar month (Infinity)
  maxLedgerEntries: number; // Total Transaction rows (Infinity)
  maxExportsPerDay: number; // Tally XML / GST exports per UTC day (Infinity)
  maxWarehouses: number; // Multi-branch / godown count
  maxGstins: number; // Maximum allowed GSTINs
  tallyExport: boolean; // Tally XML export allowed
  gstReturns: boolean; // GST summary report access
  payroll: boolean; // HR + Payroll module access
  hasAutoBrs: boolean; // Auto Bank Reconciliation enabled
  advancedVerticals: boolean; // NBFC, Healthcare (high-compliance verticals)
  apiRateLimit: number; // req/60s/IP
  apiAccess: boolean; // Direct API token access
  priceMonthlyInr: number | null; // INR/month (null = Free)
}

export type PlanResource = keyof PlanQuotas;

// ---------------------------------------------------------------------------
// Indian market plan table
//
// Benchmarked against: Tally Prime (~₹18k/yr), Zoho Books (₹3,499/mo Business),
// Busy Accounting (~₹9k/yr), Vyapar (₹3,499/yr).
// Nexus is positioned above Tally but below SAP Business One.
// ---------------------------------------------------------------------------
export const PLAN_QUOTAS: Record<PlanType, PlanQuotas> = {
  // ---- Free ---- 30 Day Trial (Unrestricted)
  [PlanType.Free]: {
    maxUsers: 99_999,
    maxCaSeats: 99_999,
    maxProducts: 99_999_999,
    maxInvoicesPerMonth: 99_999_999, // UNLIMITED
    maxLedgerEntries: 99_999_999, // UNLIMITED
    maxExportsPerDay: 99_999_999, // UNLIMITED
    maxWarehouses: 99_999,
    maxGstins: 99_999,
    tallyExport: true,
    gstReturns: true,
    payroll: true,
    hasAutoBrs: true,
    advancedVerticals: true,
    apiRateLimit: 2_000,
    apiAccess: true,
    priceMonthlyInr: null,
  },

  // ---- Starter (₹999/mo) ---- Sole proprietors, freelancers, small shops.
  [PlanType.Starter]: {
    maxUsers: 3,
    maxCaSeats: 1,
    maxProducts: 99_999_999,
    maxInvoicesPerMonth: 99_999_999, // UNLIMITED
    maxLedgerEntries: 99_999_999, // UNLIMITED
    maxExportsPerDay: 99_999_999, // UNLIMITED
    maxWarehouses: 1,
    maxGstins: 1,
    tallyExport: true,
    gstReturns: true,
    payroll: false,
    hasAutoBrs: false,
    advancedVerticals: false,
    apiRateLimit: 100,
    apiAccess: false,
    priceMonthlyInr: 999,
  },

  // ---- Growth (₹2,499/mo) ---- Small traders, retailers, manufacturers.
  [PlanType.Growth]: {
    maxUsers: 10,
    maxCaSeats: 2,
    maxProducts: 99_999_999,
    maxInvoicesPerMonth: 99_999_999, // UNLIMITED
    maxLedgerEntries: 99_999_999, // UNLIMITED
    maxExportsPerDay: 99_999_999, // UNLIMITED
    maxWarehouses: 3,
    maxGstins: 2,
    tallyExport: true,
    gstReturns: true,
    payroll: true,
    hasAutoBrs: true,
    advancedVerticals: false,
    apiRateLimit: 200,
    apiAccess: false,
    priceMonthlyInr: 2_499,
  },

  // ---- Business (₹5,999/mo) ---- Growing SMEs, dealer networks, distributors.
  [PlanType.Business]: {
    maxUsers: 30,
    maxCaSeats: 3,
    maxProducts: 99_999_999,
    maxInvoicesPerMonth: 99_999_999, // UNLIMITED
    maxLedgerEntries: 99_999_999, // UNLIMITED
    maxExportsPerDay: 99_999_999, // UNLIMITED
    maxWarehouses: 10,
    maxGstins: 5,
    tallyExport: true,
    gstReturns: true,
    payroll: true,
    hasAutoBrs: true,
    advancedVerticals: false,
    apiRateLimit: 400,
    apiAccess: true,
    priceMonthlyInr: 5_999,
  },

  // ---- Enterprise (Custom / ₹14,999+ /mo) ---- Large orgs, CA firms, NBFCs, hospitals.
  [PlanType.Enterprise]: {
    maxUsers: 99_999,
    maxCaSeats: 99_999,
    maxProducts: 99_999_999,
    maxInvoicesPerMonth: 99_999_999,
    maxLedgerEntries: 99_999_999,
    maxExportsPerDay: 99_999_999,
    maxWarehouses: 99_999,
    maxGstins: 99_999,
    tallyExport: true,
    gstReturns: true,
    payroll: true,
    hasAutoBrs: true,
    advancedVerticals: true,
    apiRateLimit: 2_000,
    apiAccess: true,
    priceMonthlyInr: 14_999,
  },
};

const GRACE_PERIOD_DAYS = 14;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private logging: LoggingService,
  ) {}

  // -------------------------------------------------------------------------
  // Quota & status checks
  // -------------------------------------------------------------------------

  async getTenantSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        name: true,
        subscriptionStatus: true,
        planExpiresAt: true,
        gracePeriodEndsAt: true,
        suspendedAt: true,
        suspendReason: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const quotas = PLAN_QUOTAS[tenant.plan];
    const now = new Date();
    let daysRemaining: number | null = null;

    if (tenant.planExpiresAt) {
      daysRemaining = Math.ceil(
        (tenant.planExpiresAt.getTime() - now.getTime()) / 86_400_000,
      );
    }

    return { ...tenant, quotas, daysRemaining };
  }

  /**
   * Enforcement gate called by PlanGuard.
   * Fail-open: if the DB throws, we log and allow the request.
   * Billing infrastructure failure must never block legitimate business ops.
   */
  async enforceAccess(
    tenantId: string,
    isWriteOperation: boolean,
  ): Promise<void> {
    let tenant: any;
    try {
      tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subscriptionStatus: true, suspendReason: true },
      });
    } catch (err) {
      this.logger.error(
        `[BillingService] DB error during access check — fail-open`,
        err,
      );
      return;
    }

    if (!tenant) return;

    if (tenant.subscriptionStatus === SubscriptionStatus.Suspended) {
      throw new GoneException(
        `Account suspended${tenant.suspendReason ? ': ' + tenant.suspendReason : ''}. Contact support@nexuserp.in to reactivate.`,
      );
    }

    if (
      tenant.subscriptionStatus === SubscriptionStatus.ReadOnly &&
      isWriteOperation
    ) {
      throw new ForbiddenException(
        'Subscription expired. Your data is safe and readable. Renew your plan at nexuserp.in to resume operations.',
      );
    }
  }

  /**
   * Check a specific resource quota.
   * SECURITY (SUB-001): Supports optional Transaction Client for atomic locking.
   */
  async checkQuota(
    tenantId: string,
    resource: PlanResource,
    tx?: any,
  ): Promise<void> {
    const db = tx || this.prisma;
    let tenant: any;
    try {
      // If in transaction, perform row-level lock on Tenant to prevent concurrent quota bypass
      if (tx) {
        // SEC-002: Use parameterized $queryRaw to prevent SQL injection via tenantId
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`,
        );
      }

      tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, subscriptionStatus: true },
      });
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.error(`[BillingService] Quota check failed — fail-open`, err);
      return; // fail-open
    }
    if (!tenant) return;

    const quotas = PLAN_QUOTAS[tenant.plan as PlanType];
    const planName = tenant.plan as string;

    if (resource === 'maxProducts') {
      const count = await db.product.count({ where: { tenantId } });
      if (count >= quotas.maxProducts) {
        throw new ForbiddenException(
          `SKU limit reached (${quotas.maxProducts.toLocaleString('en-IN')} on ${planName} plan). Upgrade to add more products.`,
        );
      }
      this.emitQuotaWarningIfNearing(
        tenantId,
        resource,
        count,
        quotas.maxProducts,
        planName,
      );
    }

    if (resource === 'maxUsers') {
      const count = await db.tenantUser.count({ where: { tenantId } });
      if (count >= quotas.maxUsers) {
        throw new ForbiddenException(
          `User seat limit reached (${quotas.maxUsers} on ${planName} plan). Upgrade to add more staff.`,
        );
      }
      this.emitQuotaWarningIfNearing(
        tenantId,
        resource,
        count,
        quotas.maxUsers,
        planName,
      );
    }

    if (resource === 'maxLedgerEntries') {
      const count = await db.transaction.count({ where: { tenantId } });
      if (count >= quotas.maxLedgerEntries) {
        throw new ForbiddenException(
          `Ledger entry limit reached (${quotas.maxLedgerEntries.toLocaleString('en-IN')} on ${planName} plan). Upgrade for higher limits.`,
        );
      }
      this.emitQuotaWarningIfNearing(
        tenantId,
        resource,
        count,
        quotas.maxLedgerEntries,
        planName,
      );
    }

    if (resource === 'maxInvoicesPerMonth') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const count = await db.invoice.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      });
      if (count >= quotas.maxInvoicesPerMonth) {
        throw new ForbiddenException(
          `Monthly invoice limit reached (${quotas.maxInvoicesPerMonth.toLocaleString('en-IN')} on ${planName} plan). Upgrade or wait for next month.`,
        );
      }
      this.emitQuotaWarningIfNearing(
        tenantId,
        resource,
        count,
        quotas.maxInvoicesPerMonth,
        planName,
      );
    }

    if (resource === 'maxExportsPerDay') {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const count = await db.billingEvent.count({
        where: {
          tenantId,
          event: 'EXPORT_GENERATED',
          createdAt: { gte: startOfDay },
        },
      });
      if (count >= quotas.maxExportsPerDay) {
        throw new ForbiddenException(
          `Daily export limit reached (${quotas.maxExportsPerDay} on ${planName} plan). Upgrade for more Tally/GST exports.`,
        );
      }
      this.emitQuotaWarningIfNearing(
        tenantId,
        resource,
        count,
        quotas.maxExportsPerDay,
        planName,
      );
    }

    if (resource === 'payroll' && !quotas.payroll) {
      throw new ForbiddenException(
        `Payroll module is not available on ${planName}. Upgrade to Growth (\u20b92,499/mo) or higher.`,
      );
    }

    if (
      (resource as any) === 'multiGstin' ||
      (resource as any) === 'maxGstins'
    ) {
      const count = 1; // Backend does not support multiple GSTIN models yet.
      if (count > quotas.maxGstins) {
        throw new ForbiddenException(
          `GSTIN limit reached (${quotas.maxGstins} on ${planName} plan). Upgrade to add more GSTINs.`,
        );
      }
    }

    if (resource === 'advancedVerticals' && !quotas.advancedVerticals) {
      throw new ForbiddenException(
        `NBFC and Healthcare verticals are available on Enterprise plan only. Contact sales@nexuserp.in.`,
      );
    }
  }

  /**
   * BIL-002: Emit a structured WARN log when a tenant's usage reaches 80% of their plan limit.
   * This gives the monitoring/alerting layer a consistent signal to trigger upgrade nudge emails
   * or in-app notifications without blocking the request path.
   *
   * The 80% threshold is configurable here. The log format is structured so it can be parsed
   * by external log aggregators (Datadog, CloudWatch, etc.) for automated alerting.
   */
  private emitQuotaWarningIfNearing(
    tenantId: string,
    resource: string,
    currentCount: number,
    limit: number,
    planName: string,
    thresholdPct: number = 80,
  ): void {
    if (!isFinite(limit) || limit <= 0) return; // Skip for Infinity limits (Enterprise)
    const usagePct = Math.round((currentCount / limit) * 100);
    if (usagePct >= thresholdPct) {
      this.logger.warn(
        `[QUOTA_WARNING] tenantId=${tenantId} resource=${resource} ` +
          `usage=${currentCount}/${limit} (${usagePct}%) plan=${planName} ` +
          `threshold=${thresholdPct}% action=UPGRADE_NUDGE_REQUIRED`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle transitions
  // -------------------------------------------------------------------------

  async upgradePlan(tenantId: string, newPlan: PlanType, performedBy?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan: newPlan,
          subscriptionStatus: SubscriptionStatus.Active,
          planExpiresAt: expiresAt,
          gracePeriodEndsAt: null,
          suspendedAt: null,
          suspendReason: null,
        },
      });

      await tx.billingEvent.create({
        data: {
          tenantId,
          event: 'PLAN_UPGRADED',
          fromPlan: tenant.plan,
          toPlan: newPlan,
          fromStatus: tenant.subscriptionStatus,
          toStatus: SubscriptionStatus.Active,
          performedBy: performedBy ?? 'system',
          metadata: {
            priceInr: PLAN_QUOTAS[newPlan].priceMonthlyInr,
          },
        },
      });
    });

    this.logger.log(`[Billing] Tenant ${tenantId} upgraded to ${newPlan}`);
    return {
      success: true,
      plan: newPlan,
      expiresAt,
      priceMonthlyInr: PLAN_QUOTAS[newPlan].priceMonthlyInr,
    };
  }

  async enterGracePeriod(
    tenantId: string,
    reason: string,
    performedBy?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: SubscriptionStatus.GracePeriod,
          gracePeriodEndsAt,
        },
      });
      await tx.billingEvent.create({
        data: {
          tenantId,
          event: 'GRACE_PERIOD_ENTERED',
          fromStatus: tenant.subscriptionStatus,
          toStatus: SubscriptionStatus.GracePeriod,
          reason,
          performedBy: performedBy ?? 'system',
          metadata: { gracePeriodEndsAt, graceDays: GRACE_PERIOD_DAYS },
        },
      });
    });

    this.logger.warn(
      `[Billing] Tenant ${tenantId} entered grace period — expires ${gracePeriodEndsAt}`,
    );
    return {
      success: true,
      gracePeriodEndsAt,
      message: `Your account has a ${GRACE_PERIOD_DAYS}-day grace period. All features remain active. Please renew before ${gracePeriodEndsAt.toLocaleDateString('en-IN')}.`,
    };
  }

  async downgradeToReadOnly(
    tenantId: string,
    reason: string,
    performedBy?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { subscriptionStatus: SubscriptionStatus.ReadOnly },
      });
      await tx.billingEvent.create({
        data: {
          tenantId,
          event: 'READ_ONLY_DOWNGRADE',
          fromStatus: tenant.subscriptionStatus,
          toStatus: SubscriptionStatus.ReadOnly,
          reason,
          performedBy: performedBy ?? 'system',
        },
      });
    });

    this.logger.warn(`[Billing] Tenant ${tenantId} downgraded to ReadOnly`);
    return { success: true };
  }

  /**
   * Non-destructive suspension — accounting data is NEVER deleted.
   * All access blocked. Data fully preserved for reactivation.
   */
  async suspendTenant(tenantId: string, reason: string, performedBy?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: SubscriptionStatus.Suspended,
          suspendedAt: new Date(),
          suspendReason: reason,
        },
      });
      await tx.billingEvent.create({
        data: {
          tenantId,
          event: 'SUSPENDED',
          fromStatus: tenant.subscriptionStatus,
          toStatus: SubscriptionStatus.Suspended,
          reason,
          performedBy: performedBy ?? 'system',
        },
      });
    });

    await this.logging.log({
      tenantId,
      action: 'TENANT_SUSPENDED',
      resource: 'Tenant',
      details: { reason, performedBy },
    });

    this.logger.warn(
      `[Billing] Tenant ${tenantId} SUSPENDED — reason: ${reason}`,
    );
    return { success: true, suspended: true };
  }

  async reactivateTenant(
    tenantId: string,
    newPlan?: PlanType,
    performedBy?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan: newPlan ?? tenant.plan,
          subscriptionStatus: SubscriptionStatus.Active,
          planExpiresAt: expiresAt,
          gracePeriodEndsAt: null,
          suspendedAt: null,
          suspendReason: null,
        },
      });
      await tx.billingEvent.create({
        data: {
          tenantId,
          event: 'REACTIVATED',
          fromStatus: tenant.subscriptionStatus,
          toStatus: SubscriptionStatus.Active,
          fromPlan: tenant.plan,
          toPlan: newPlan ?? tenant.plan,
          performedBy: performedBy ?? 'system',
        },
      });
    });

    await this.logging.log({
      tenantId,
      action: 'TENANT_REACTIVATED',
      resource: 'Tenant',
      details: { performedBy, plan: newPlan ?? tenant.plan },
    });

    this.logger.log(`[Billing] Tenant ${tenantId} reactivated`);
    return { success: true, plan: newPlan ?? tenant.plan, expiresAt };
  }

  async recordExport(tenantId: string, exportType: string) {
    await this.prisma.billingEvent.create({
      data: {
        tenantId,
        event: 'EXPORT_GENERATED',
        metadata: { exportType },
        performedBy: 'system',
      },
    });
  }

  // --- Webhook Integration (SUB-002) ---

  async handleSubscriptionFailure(
    razorpaySubscriptionId: string,
    reason: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Secure Row-level lock (SYS-001) ensuring Webhook atomicity
      // SEC-WEBHOOK-002: Use tagged template for safe parameterization
      const tenants = await tx.$queryRaw<any[]>`
        SELECT id, "subscriptionStatus" FROM "Tenant" WHERE "razorpaySubscriptionId" = ${razorpaySubscriptionId} FOR UPDATE
      `;
      const tenant = tenants[0];

      if (!tenant) {
        this.logger.error(
          `[Billing] Tenant not found for sub: ${razorpaySubscriptionId}`,
        );
        return;
      }

      if (tenant.subscriptionStatus !== SubscriptionStatus.ReadOnly) {
        this.logger.warn(
          `[Billing] Auto-downgrading tenant ${tenant.id} due to payment failure`,
        );

        await tx.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: SubscriptionStatus.ReadOnly },
        });

        await tx.billingEvent.create({
          data: {
            tenantId: tenant.id,
            event: 'READ_ONLY_DOWNGRADE',
            fromStatus: tenant.subscriptionStatus,
            toStatus: SubscriptionStatus.ReadOnly,
            reason: `Webhook: ${reason}`,
            performedBy: 'system',
          },
        });
      }
    });
  }

  async handleSubscriptionSuccess(razorpaySubscriptionId: string) {
    await this.prisma.$transaction(async (tx) => {
      // SEC-WEBHOOK-002: Use tagged template for safe parameterization
      const tenants = await tx.$queryRaw<any[]>`
        SELECT id, "subscriptionStatus", plan FROM "Tenant" WHERE "razorpaySubscriptionId" = ${razorpaySubscriptionId} FOR UPDATE
      `;
      const tenant = tenants[0];

      if (!tenant) return;

      if (tenant.subscriptionStatus !== SubscriptionStatus.Active) {
        this.logger.log(
          `[Billing] Auto-reactivating tenant ${tenant.id} due to payment success`,
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.Active,
            planExpiresAt: expiresAt,
            gracePeriodEndsAt: null,
            suspendedAt: null,
            suspendReason: null,
          },
        });

        await tx.billingEvent.create({
          data: {
            tenantId: tenant.id,
            event: 'REACTIVATED',
            fromStatus: tenant.subscriptionStatus,
            toStatus: SubscriptionStatus.Active,
            fromPlan: tenant.plan,
            toPlan: tenant.plan,
            performedBy: 'webhook',
          },
        });
      }
    });
  }

  async getBillingHistory(tenantId: string) {
    return this.prisma.billingEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
