import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { HttpCacheInterceptor } from '../common/interceptors/cache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('orders')
  @Permissions(Permission.CREATE_INVOICE)
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.salesService.createOrder(req.user.tenantId, dto);
  }

  @Get('orders')
  @Permissions(Permission.CREATE_INVOICE)
  getOrders(@Req() req: any) {
    return this.salesService.getOrders(req.user.tenantId);
  }

  @Get('orders/:id')
  @Permissions(Permission.CREATE_INVOICE)
  getOrderById(@Req() req: any, @Param('id') id: string) {
    return this.salesService.getOrderById(req.user.tenantId, id);
  }

  @Patch('orders/:id/status')
  @Permissions(Permission.CREATE_INVOICE)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.salesService.updateOrderStatus(req.user.tenantId, id, status);
  }

  @Get('stats')
  @Permissions(Permission.VIEW_REPORTS)
  @CacheTTL(60 * 1000) // Cache for 1 min
  @UseInterceptors(HttpCacheInterceptor)
  getStats(@Req() req: any) {
    return this.salesService.getSalesStats(req.user.tenantId);
  }
}
