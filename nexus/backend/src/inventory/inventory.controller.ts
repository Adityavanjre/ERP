import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permission } from '../common/constants/permissions';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Module } from '../common/decorators/module.decorator';
import { MobileAction } from '../common/decorators/mobile-action.decorator';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  LogMovementDto,
  PostOpeningBalanceDto,
  TransferStockDto,
  CreateProductDto,
  UpdateProductDto
} from './dto/inventory.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Module('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly warehouseService: WarehouseService,
  ) { }

  @Get('warehouses')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  getWarehouses(@TenantId() tenantId: string) {
    return this.warehouseService.getWarehouses(tenantId);
  }

  @Post('warehouses')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.ADJUST_STOCK)
  createWarehouse(@TenantId() tenantId: string, @Body() data: CreateWarehouseDto) {
    return this.warehouseService.createWarehouse(tenantId, data);
  }

  @Patch('warehouses/:id')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.ADJUST_STOCK)
  updateWarehouse(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: UpdateWarehouseDto,
  ) {
    return this.warehouseService.updateWarehouse(tenantId, id, data);
  }

  @Post('movements')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  logMovement(@TenantId() tenantId: string, @Body() data: LogMovementDto) {
    return this.warehouseService.logMovement(tenantId, data);
  }

  @Post('products/:id/opening-balance')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.ADJUST_STOCK)
  postOpeningBalance(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: PostOpeningBalanceDto
  ) {
    return this.warehouseService.logOpeningBalance(tenantId, {
      ...data,
      productId: id,
    });
  }

  @Post('transfers')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  transferStock(@TenantId() tenantId: string, @Body() data: TransferStockDto) {
    return this.warehouseService.transferStock(tenantId, data);
  }

  @Post('products')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  create(@Req() req: any, @Body() createProductDto: CreateProductDto) {
    return this.inventoryService.createProduct(
      req.user.tenantId,
      { ...createProductDto, correlationId: req['correlationId'] },
      req.user.id,
    );
  }

  @Post('import')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  uploadFile(
    @Req() req: any,
    @Body() body: any,
    @Query('dryRun') dryRun?: string,
  ) {
    // Basic text/csv handling
    const csvContent = body.csv || body;
    return this.inventoryService.importProducts(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
      { dryRun: dryRun === 'true', correlationId: req['correlationId'] }
    );
  }

  @Get('products')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  @MobileAction('VIEW_PRODUCTS')
  findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getProducts(
      req.user.tenantId,
      Number(page) || 1,
      Number(limit) || 50,
      search,
    );
  }

  @Get('products/find-by-code')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  findByCode(@Req() req: any, @Query('code') code: string) {
    return this.inventoryService.findProductByCode(req.user.tenantId, code);
  }

  @Get('products/:id')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.inventoryService.getProduct(req.user.tenantId, id);
  }

  @Patch('products/:id')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(
      req.user.tenantId,
      id,
      updateProductDto,
      req.user.id,
    );
  }

  @Delete('products/:id')
  @Roles(Role.Owner)
  @Permissions(Permission.MANAGE_USERS)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.inventoryService.deleteProduct(req.user.tenantId, id);
  }

  @Get('stats')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: any) {
    return this.inventoryService.getStats(req.user.tenantId);
  }

  @Get('markdown-suggestions')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getMarkdownSuggestions(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getMarkdownSuggestions(
      req.user.tenantId,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }
}
