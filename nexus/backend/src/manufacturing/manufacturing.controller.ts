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
import {
  CreateBOMDto,
  CreateWorkOrderDto,
  CreateMachineDto,
  CompleteWorkOrderDto,
  StartWorkOrderDto,
  UpdateWOStatusDto,
  ImportBomsDto,
} from './dto/manufacturing.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Module('manufacturing')
@Controller('manufacturing')
@UseInterceptors(AuditInterceptor)
export class ManufacturingController {
  constructor(
    private readonly mfgService: ManufacturingService,
    private readonly aiService: AiService,
  ) {}

  @Get('overview')
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getOverview(@CurrentUser() user: any) {
    return this.mfgService.getDashboardOverview(user.tenantId);
  }

  @Get('boms/:id/yield-analysis')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getYieldAnalysis(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiService.getYieldAnalysis(user.tenantId, id);
  }

  // BOMs
  @Post('boms')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.ADJUST_STOCK)
  createBOM(@CurrentUser() user: any, @Body() dto: CreateBOMDto) {
    return this.mfgService.createBOM(user.tenantId, dto);
  }

  @Get('boms')
  @Permissions(Permission.VIEW_PRODUCTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getBOMs(@CurrentUser() user: any) {
    return this.mfgService.getBOMs(user.tenantId);
  }

  @Get('boms/:id/shortages')
  @Permissions(Permission.VIEW_PRODUCTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  checkBOMShortages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('quantity') qty: string,
  ) {
    return this.mfgService.checkShortages(
      user.tenantId,
      id,
      parseFloat(qty) || 1,
    );
  }

  @Post('import/boms')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.ADJUST_STOCK)
  importBoms(@CurrentUser() user: any, @Body() dto: ImportBomsDto) {
    return this.mfgService.importBoms(user.tenantId, dto.csv);
  }

  @Get('boms/:id')
  @Permissions(Permission.VIEW_PRODUCTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getBOMDetails(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.getBOMDetails(user.tenantId, id);
  }

  @Get('boms/:id/explode')
  @Permissions(Permission.VIEW_PRODUCTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  async explodeBOM(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('quantity') qty: string,
  ) {
    return this.mfgService.explodeBOM(user.tenantId, id, parseFloat(qty) || 1);
  }

  @Get('boms/:id/cost')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  async getBOMCost(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.getBOMCost(user.tenantId, id);
  }

  // Work Orders
  @Post('work-orders')
  @Roles(Role.Owner, Role.Manager, Role.Biller)
  @Permissions(Permission.ADJUST_STOCK)
  createWO(@CurrentUser() user: any, @Body() dto: CreateWorkOrderDto) {
    return this.mfgService.createWorkOrder(user.tenantId, dto);
  }

  @Get('work-orders')
  @Permissions(Permission.ADJUST_STOCK)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getWOs(@CurrentUser() user: any) {
    return this.mfgService.getWorkOrders(user.tenantId);
  }

  @Patch('work-orders/:id/status')
  @Roles(Role.Owner, Role.Manager, Role.Biller)
  @Permissions(Permission.ADJUST_STOCK)
  updateWOStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWOStatusDto,
  ) {
    return this.mfgService.updateWorkOrderStatus(user.tenantId, id, dto.status);
  }

  @Post('work-orders/:id/approve')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.ADJUST_STOCK)
  @MobileAction('APPROVE_WO')
  approveWO(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.approveWorkOrder(user.tenantId, id, user);
  }

  @Post('work-orders/:id/reject')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.ADJUST_STOCK)
  @MobileAction('REJECT_WO')
  rejectWO(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.rejectWorkOrder(user.tenantId, id, user);
  }

  @Get('work-orders/:id/shortages')
  @Permissions(Permission.VIEW_PRODUCTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  checkShortages(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mfgService.checkShortagesFromWO(user.tenantId, id);
  }

  @Post('work-orders/:id/start')
  @Roles(Role.Owner, Role.Manager, Role.Biller)
  @Permissions(Permission.ADJUST_STOCK)
  startWO(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: StartWorkOrderDto,
  ) {
    return this.mfgService.startWorkOrder(
      user.tenantId,
      id,
      dto.warehouseId,
      dto.machineId,
      dto.idempotencyKey,
    );
  }

  @Post('work-orders/:id/complete')
  @Roles(Role.Owner, Role.Manager, Role.Biller)
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
      dto.idempotencyKey,
    );
  }

  // Machines — delegated to MachineController at /manufacturing/machines
  // Removed duplicate routes to prevent NestJS routing conflicts (CRIT-MFG-001)
}
