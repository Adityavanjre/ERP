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
import { ManufacturingService } from './manufacturing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manufacturing')
export class ManufacturingController {
  constructor(private readonly mfgService: ManufacturingService) {}

  // BOMs
  @Post('boms')
  createBOM(@Req() req: any, @Body() dto: any) {
    return this.mfgService.createBOM(req.user.tenantId, dto);
  }

  @Get('boms')
  getBOMs(@Req() req: any) {
    return this.mfgService.getBOMs(req.user.tenantId);
  }

  @Get('boms/:id/explode')
  explodeBOM(@Param('id') id: string) {
    return this.mfgService.explodeBOM(id);
  }

  // Work Orders
  @Post('work-orders')
  createWO(@Req() req: any, @Body() dto: any) {
    return this.mfgService.createWorkOrder(req.user.tenantId, dto);
  }

  @Get('work-orders')
  getWOs(@Req() req: any) {
    return this.mfgService.getWorkOrders(req.user.tenantId);
  }

  @Patch('work-orders/:id/status')
  updateWOStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.mfgService.updateWorkOrderStatus(req.user.tenantId, id, status);
  }

  @Get('work-orders/:id/shortages')
  checkShortages(@Req() req: any, @Param('id') id: string) {
    // Need to fetch WO first to get BOM and quantity
    return this.mfgService.checkShortagesFromWO(req.user.tenantId, id);
  }

  @Post('work-orders/:id/complete')
  completeWO(@Req() req: any, @Param('id') id: string) {
    return this.mfgService.completeWorkOrder(req.user.tenantId, id);
  }

  @Get('boms/:id/cost')
  getCost(@Param('id') id: string) {
    return this.mfgService.getBOMCost(id);
  }
}
