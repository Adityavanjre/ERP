import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { POStatus } from '@prisma/client';


import { Module } from '../common/decorators/module.decorator';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreatePurchaseOrderDto,
  UpdatePOStatusDto,
  SupplierOpeningBalanceDto,
  ImportSuppliersDto,
} from './dto/purchases.dto';

@UseGuards(JwtAuthGuard,  PermissionsGuard)
@Module('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('suppliers')
  @Permissions(Permission.MANAGE_SUPPLIERS)
  createSupplier(@Req() req: any, @Body() dto: CreateSupplierDto) {
    return this.purchasesService.createSupplier(req.user.tenantId, dto);
  }

  @Get('suppliers')
  @Permissions(Permission.VIEW_PRODUCTS)
  getSuppliers(@Req() req: any) {
    return this.purchasesService.getSuppliers(req.user.tenantId);
  }

  @Patch('suppliers/:id')
  @Permissions(Permission.MANAGE_SUPPLIERS)
  updateSupplier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.purchasesService.updateSupplier(req.user.tenantId, id, dto);
  }

  @Post('import')
  @Permissions(Permission.MANAGE_SUPPLIERS)
  importSuppliers(@Req() req: any, @Body() body: ImportSuppliersDto) {
    const csvContent = body.csv || body;
    return this.purchasesService.importSuppliers(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Post('orders')
  @Permissions(Permission.ADJUST_STOCK)
  createPO(@Req() req: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchasesService.createPurchaseOrder(req.user.tenantId, dto);
  }

  @Get('orders')
  @Permissions(Permission.VIEW_PRODUCTS)
  getPOs(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.purchasesService.getPurchaseOrders(
      req.user.tenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Patch('orders/:id/status')
  @Permissions(Permission.ADJUST_STOCK)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePOStatusDto,
  ) {
    return this.purchasesService.updatePOStatus(
      req.user.tenantId,
      id,
      dto.status,
      dto.warehouseId,
    );
  }

  @Get('stats')
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: any) {
    return this.purchasesService.getPurchasesStats(req.user.tenantId);
  }

  // --- Opening Balances ---
  @Post('suppliers/opening-balance')
  @Permissions(Permission.MANAGE_SUPPLIERS)
  addOpeningBalance(@Req() req: any, @Body() dto: SupplierOpeningBalanceDto) {
    return this.purchasesService.addSupplierOpeningBalance(
      req.user.tenantId,
      dto,
    );
  }

  @Get('suppliers/:id/opening-balances')
  @Permissions(Permission.VIEW_PRODUCTS)
  getOpeningBalances(@Req() req: any, @Param('id') id: string) {
    return this.purchasesService.getSupplierOpeningBalances(
      req.user.tenantId,
      id,
    );
  }
}
