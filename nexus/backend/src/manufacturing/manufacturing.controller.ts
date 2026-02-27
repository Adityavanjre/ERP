import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { Module } from '../common/decorators/module.decorator';
import { MobileAction } from '../common/decorators/mobile-action.decorator';
import { AiService } from '../system/services/ai.service';
import { CreateBOMDto, CreateWorkOrderDto, CreateMachineDto, CompleteWorkOrderDto } from './dto/manufacturing.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Module('manufacturing')
@Controller('manufacturing')
@UseInterceptors(AuditInterceptor)
export class ManufacturingController {
  constructor(
    private readonly mfgService: ManufacturingService,
    private readonly aiService: AiService
  ) { }

  @Get('boms/:id/yield-analysis')
  @Permissions(Permission.VIEW_REPORTS)
  getYieldAnalysis(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiService.getYieldAnalysis(user.tenantId, id);
  }

  // BOMs
  @Post('boms')
  @Permissions(Permission.ADJUST_STOCK)
  createBOM(@CurrentUser() user: any, @Body() dto: CreateBOMDto) {
    return this.mfgService.createBOM(user.tenantId, dto);
  }

  @Get('boms')
  @Permissions(Permission.VIEW_PRODUCTS)
  getBOMs(@CurrentUser() user: any) {
    return this.mfgService.getBOMs(user.tenantId);
  }

  @Post('import/boms')
  @Permissions(Permission.ADJUST_STOCK)
  importBoms(@CurrentUser() user: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.mfgService.importBoms(
      user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Get('boms/:id')
  @Permissions(Permission.VIEW_PRODUCTS)
  getBOMDetails(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.getBOMDetails(user.tenantId, id);
  }

  @Get('boms/:id/explode')
  @Permissions(Permission.VIEW_PRODUCTS)
  async explodeBOM(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('quantity') qty: string,
  ) {
    return this.mfgService.explodeBOM(user.tenantId, id, parseFloat(qty) || 1);
  }

  @Get('boms/:id/cost')
  @Permissions(Permission.VIEW_REPORTS)
  async getBOMCost(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.getBOMCost(user.tenantId, id);
  }

  // Work Orders
  @Post('work-orders')
  @Permissions(Permission.ADJUST_STOCK)
  createWO(@CurrentUser() user: any, @Body() dto: CreateWorkOrderDto) {
    return this.mfgService.createWorkOrder(user.tenantId, dto);
  }

  @Get('work-orders')
  @Permissions(Permission.VIEW_PRODUCTS)
  getWOs(@CurrentUser() user: any) {
    return this.mfgService.getWorkOrders(user.tenantId);
  }

  @Patch('work-orders/:id/status')
  @Permissions(Permission.ADJUST_STOCK)
  updateWOStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.mfgService.updateWorkOrderStatus(user.tenantId, id, status);
  }

  @Post('work-orders/:id/approve')
  @Permissions(Permission.ADJUST_STOCK)
  @MobileAction('APPROVE_WO')
  approveWO(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.approveWorkOrder(user.tenantId, id, user);
  }

  @Post('work-orders/:id/reject')
  @Permissions(Permission.ADJUST_STOCK)
  @MobileAction('REJECT_WO')
  rejectWO(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.rejectWorkOrder(user.tenantId, id, user);
  }

  @Get('work-orders/:id/shortages')
  @Permissions(Permission.VIEW_PRODUCTS)
  checkShortages(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.checkShortagesFromWO(user.tenantId, id);
  }

  @Post('work-orders/:id/complete')
  @Permissions(Permission.ADJUST_STOCK)
  completeWO(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CompleteWorkOrderDto,
  ) {
    return this.mfgService.completeWorkOrder(
      user.tenantId,
      id,
      dto.producedQuantity,
      dto.scrapQuantity,
      dto.machineId,
      dto.machineTimeHours,
      dto.operatorName,
      dto.warehouseId,
      dto.idempotencyKey
    );
  }

  // Machines
  @Post('machines')
  @Permissions(Permission.ADJUST_STOCK)
  createMachine(@CurrentUser() user: any, @Body() data: CreateMachineDto) {
    return this.mfgService.createMachine(user.tenantId, data);
  }

  @Get('machines')
  @Permissions(Permission.VIEW_PRODUCTS)
  getMachines(@CurrentUser() user: any) {
    return this.mfgService.getMachines(user.tenantId);
  }
}
