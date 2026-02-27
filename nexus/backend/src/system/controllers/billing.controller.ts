import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PlanType } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  // --- Tenant-facing ---

  @Get('status')
  getStatus(@Req() req: any) {
    return this.billingService.getTenantSubscription(req.user.tenantId);
  }

  @Get('history')
  getHistory(@Req() req: any) {
    return this.billingService.getBillingHistory(req.user.tenantId);
  }

  @Post('upgrade')
  upgrade(@Req() req: any, @Body('plan') plan: PlanType) {
    return this.billingService.upgradePlan(
      req.user.tenantId,
      plan,
      req.user.userId,
    );
  }

  // --- Admin-only lifecycle controls ---

  @UseGuards(AdminGuard)
  @Post('admin/:tenantId/suspend')
  suspendTenant(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.billingService.suspendTenant(tenantId, reason ?? 'admin-action', req.user.userId);
  }

  @UseGuards(AdminGuard)
  @Post('admin/:tenantId/reactivate')
  reactivateTenant(
    @Param('tenantId') tenantId: string,
    @Body('plan') plan: PlanType,
    @Req() req: any,
  ) {
    return this.billingService.reactivateTenant(tenantId, plan, req.user.userId);
  }

  @UseGuards(AdminGuard)
  @Post('admin/:tenantId/grace-period')
  enterGracePeriod(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.billingService.enterGracePeriod(tenantId, reason ?? 'payment-overdue', req.user.userId);
  }

  @UseGuards(AdminGuard)
  @Post('admin/:tenantId/read-only')
  downgradeToReadOnly(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.billingService.downgradeToReadOnly(tenantId, reason ?? 'grace-expired', req.user.userId);
  }
}
