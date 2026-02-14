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
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { HttpCacheInterceptor } from '../common/interceptors/cache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('orders')
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.salesService.createOrder(req.user.tenantId, dto);
  }

  @Get('orders')
  getOrders(@Req() req: any) {
    return this.salesService.getOrders(req.user.tenantId);
  }

  @Get('orders/:id')
  getOrderById(@Req() req: any, @Param('id') id: string) {
    return this.salesService.getOrderById(req.user.tenantId, id);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.salesService.updateOrderStatus(req.user.tenantId, id, status);
  }

  @Get('stats')
  @CacheTTL(60 * 1000) // Cache for 1 min
  @UseInterceptors(HttpCacheInterceptor)
  getStats(@Req() req: any) {
    return this.salesService.getSalesStats(req.user.tenantId);
  }
}
