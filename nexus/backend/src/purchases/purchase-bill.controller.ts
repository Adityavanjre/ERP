import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PurchaseBillService } from './purchase-bill.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';


import { Module } from '../common/decorators/module.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { UseInterceptors } from '@nestjs/common';
import {
  CreatePurchaseBillDto,
  UpdatePurchaseBillStatusDto,
} from './dto/purchase-bill.dto';

@UseGuards(JwtAuthGuard,  PermissionsGuard)
@Module('purchases')
@Controller('purchases/bills')
@UseInterceptors(AuditInterceptor)
export class PurchaseBillController {
  constructor(private readonly billService: PurchaseBillService) {}

  @Post()
  @Permissions(Permission.MANAGE_SUPPLIERS)
  create(@Req() req: any, @Body() dto: CreatePurchaseBillDto) {
    return this.billService.create(req.user.tenantId, dto);
  }

  @Get()
  @Permissions(Permission.VIEW_PRODUCTS)
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
  ) {
    return this.billService.findAll(
      req.user.tenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      supplierId,
      status,
    );
  }

  @Get(':id')
  @Permissions(Permission.VIEW_PRODUCTS)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.billService.findOne(req.user.tenantId, id);
  }

  @Patch(':id/status')
  @Permissions(Permission.MANAGE_SUPPLIERS)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseBillStatusDto,
  ) {
    return this.billService.updateStatus(req.user.tenantId, id, dto.status);
  }
}
