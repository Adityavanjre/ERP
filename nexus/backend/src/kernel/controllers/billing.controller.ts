import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanType } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kernel/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plan')
  getPlan(@Req() req: any) {
    return this.billingService.getTenantPlan(req.user.tenantId);
  }

  @Get('statement')
  getStatement(@Req() req: any) {
    return this.billingService.getBillingStatement(req.user.tenantId);
  }

  @Post('upgrade')
  upgrade(@Req() req: any, @Body('plan') plan: PlanType) {
    return this.billingService.upgradePlan(req.user.tenantId, plan);
  }
}
