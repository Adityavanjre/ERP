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

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly warehouseService: WarehouseService,
  ) {}

  @Get('warehouses')
  @Permissions(Permission.VIEW_PRODUCTS)
  getWarehouses(@TenantId() tenantId: string) {
    return this.warehouseService.getWarehouses(tenantId);
  }

  @Post('warehouses')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  createWarehouse(@TenantId() tenantId: string, @Body() data: any) {
    return this.warehouseService.createWarehouse(tenantId, data);
  }

  @Post('movements')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  logMovement(@TenantId() tenantId: string, @Body() data: any) {
    return this.warehouseService.logMovement(tenantId, data);
  }

  @Post('products')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  create(@Req() req: any, @Body() createProductDto: any) {
    return this.inventoryService.createProduct(
      req.user.tenantId,
      createProductDto,
      req.user.id,
    );
  }

  @Post('import')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  @Permissions(Permission.ADJUST_STOCK)
  uploadFile(@Req() req: any, @Body() body: any) {
    // Basic text/csv handling
    // In a real app we'd use FileInterceptor, but for survival mode without new deps:
    // User sends raw string in body if possible, or { csv: "..." } JSON
    const csvContent = body.csv || body;
    return this.inventoryService.importProducts(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Get('products')
  @Permissions(Permission.VIEW_PRODUCTS)
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
  @Permissions(Permission.VIEW_PRODUCTS)
  findByCode(@Req() req: any, @Query('code') code: string) {
    return this.inventoryService.findProductByCode(req.user.tenantId, code);
  }

  @Get('products/:id')
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
    @Body() updateProductDto: any,
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
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: any) {
    return this.inventoryService.getStats(req.user.tenantId);
  }
}
