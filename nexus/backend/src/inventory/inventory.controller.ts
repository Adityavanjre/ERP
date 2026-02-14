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
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantId } from '../common/decorators/tenant-id.decorator';

const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly warehouseService: WarehouseService,
  ) {}

  @Get('warehouses')
  getWarehouses(@TenantId() tenantId: string) {
    return this.warehouseService.getWarehouses(tenantId);
  }

  @Post('warehouses')
  @Roles(Role.Owner, Role.Manager)
  createWarehouse(@TenantId() tenantId: string, @Body() data: any) {
    return this.warehouseService.createWarehouse(tenantId, data);
  }

  @Post('movements')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  logMovement(@TenantId() tenantId: string, @Body() data: any) {
    return this.warehouseService.logMovement(tenantId, data);
  }

  @Post('products')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  create(@Req() req: any, @Body() createProductDto: any) {
    return this.inventoryService.createProduct(
      req.user.tenantId,
      createProductDto,
    );
  }

  @Post('import')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
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
  findByCode(@Req() req: any, @Query('code') code: string) {
    return this.inventoryService.findProductByCode(req.user.tenantId, code);
  }

  @Get('products/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.inventoryService.getProduct(req.user.tenantId, id);
  }

  @Patch('products/:id')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateProductDto: any,
  ) {
    return this.inventoryService.updateProduct(
      req.user.tenantId,
      id,
      updateProductDto,
    );
  }

  @Delete('products/:id')
  @Roles(Role.Owner)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.inventoryService.deleteProduct(req.user.tenantId, id);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.inventoryService.getStats(req.user.tenantId);
  }
}
