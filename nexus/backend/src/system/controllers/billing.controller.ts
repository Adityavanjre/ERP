import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PlanType, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // --- Tenant-facing ---

  @Get('status')
  @Roles(Role.Owner)
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.billingService.getTenantSubscription(
      req.user.tenantId as string,
    );
  }

  @Get('history')
  @Roles(Role.Owner)
  getHistory(@Req() req: AuthenticatedRequest) {
    return this.billingService.getBillingHistory(req.user.tenantId as string);
  }

  // SEC: Only the workspace Owner can initiate a plan upgrade.
  // Manager, CA, Biller roles do not have billing authority.
  @Roles(Role.Owner)
  @Post('upgrade')
  upgrade(@Req() req: AuthenticatedRequest, @Body('plan') plan: PlanType) {
    return this.billingService.upgradePlan(
      req.user.tenantId as string,
      plan,
      req.user.sub,
    );
  }

  // --- Admin-only lifecycle controls ---
  // These specifically require the Admin login pipeline (AdminGuard)
  // but we add Roles() for metadata consistency.

  @Post('admin/:tenantId/suspend')
  @UseGuards(AdminGuard)
  @Roles(Role.Owner)
  suspendTenant(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.billingService.suspendTenant(
      tenantId,
      reason ?? 'admin-action',
      req.user.sub,
    );
  }

  @Post('admin/:tenantId/reactivate')
  @UseGuards(AdminGuard)
  @Roles(Role.Owner)
  reactivateTenant(
    @Param('tenantId') tenantId: string,
    @Body('plan') plan: PlanType,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.billingService.reactivateTenant(tenantId, plan, req.user.sub);
  }

  @Post('admin/:tenantId/grace-period')
  @UseGuards(AdminGuard)
  @Roles(Role.Owner)
  enterGracePeriod(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.billingService.enterGracePeriod(
      tenantId,
      reason ?? 'payment-overdue',
      req.user.sub,
    );
  }

  @Post('admin/:tenantId/read-only')
  @UseGuards(AdminGuard)
  @Roles(Role.Owner)
  downgradeToReadOnly(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.billingService.downgradeToReadOnly(
      tenantId,
      reason ?? 'grace-expired',
      req.user.sub,
    );
  }
}
