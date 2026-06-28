import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConstructionService } from './construction.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { ModuleGuard } from '../common/guards/module.guard';


import { Module } from '../common/decorators/module.decorator';
import {
  CreateBOQDto,
  UpdateBOQActualsDto,
  UpdateSiteStockDto,
  GenerateRABillDto,
} from './dto/construction.dto';

@UseGuards(JwtAuthGuard,  ModuleGuard)
@Module('construction')
@Controller('construction')
export class ConstructionController {
  constructor(private readonly constructionService: ConstructionService) {}

  @Post('boq')
  create(@Req() req: any, @Body() data: CreateBOQDto) {
    return this.constructionService.createBOQ(req.user.tenantId, data);
  }

  @Patch('boq/:id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.constructionService.updateBOQStatus(
      req.user.tenantId,
      id,
      status,
    );
  }

  @Patch('boq/items/:id/actuals')
  updateActuals(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateBOQActualsDto,
  ) {
    return this.constructionService.updateBOQActuals(
      req.user.tenantId,
      id,
      data,
    );
  }

  @Post('site-stock')
  updateStock(@Req() req: any, @Body() data: UpdateSiteStockDto) {
    return this.constructionService.updateSiteStock(
      req.user.tenantId,
      data.projectId,
      data.productId,
      data.quantity,
      data.warehouseId,
    );
  }

  @Post('ra-billing')
  generateBill(@Req() req: any, @Body() data: GenerateRABillDto) {
    return this.constructionService.generateRABill(
      req.user.tenantId,
      data.projectId,
      data,
    );
  }
}
