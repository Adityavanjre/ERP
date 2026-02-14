import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { POStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('suppliers')
  createSupplier(@Req() req: any, @Body() dto: any) {
    return this.purchasesService.createSupplier(req.user.tenantId, dto);
  }

  @Get('suppliers')
  getSuppliers(@Req() req: any) {
    return this.purchasesService.getSuppliers(req.user.tenantId);
  }

  @Post('orders')
  createPO(@Req() req: any, @Body() dto: any) {
    return this.purchasesService.createPurchaseOrder(req.user.tenantId, dto);
  }

  @Get('orders')
  getPOs(@Req() req: any) {
    return this.purchasesService.getPurchaseOrders(req.user.tenantId);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: POStatus,
    @Body('warehouseId') warehouseId?: string,
  ) {
    return this.purchasesService.updatePOStatus(req.user.tenantId, id, status, warehouseId);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.purchasesService.getPurchasesStats(req.user.tenantId);
  }

  // --- Opening Balances ---
  @Post('suppliers/opening-balance')
  addOpeningBalance(@Req() req: any, @Body() dto: any) {
    return this.purchasesService.addSupplierOpeningBalance(req.user.tenantId, dto);
  }

  @Get('suppliers/:id/opening-balances')
  getOpeningBalances(@Req() req: any, @Param('id') id: string) {
    return this.purchasesService.getSupplierOpeningBalances(req.user.tenantId, id);
  }
}
