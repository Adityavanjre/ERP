import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Delete,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('customers')
  @Permissions(Permission.MANAGE_USERS)
  create(@Req() req: any, @Body() createCustomerDto: any) {
    return this.crmService.createCustomer(req.user.tenantId, createCustomerDto);
  }

  @Post('import')
  @Permissions(Permission.MANAGE_USERS)
  uploadFile(@Req() req: any, @Body() body: any) {
    // Basic text/csv handling
    const csvContent = body.csv || body;
    return this.crmService.importCustomers(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Get('customers')
  @Permissions(Permission.VIEW_PRODUCTS) // View Customers is grouped with VIEW_PRODUCTS in this system
  findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.crmService.getCustomers(
      req.user.tenantId,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Get('stats')
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: any) {
    return this.crmService.getStats(req.user.tenantId);
  }

  @Post('opportunities')
  @Permissions(Permission.CREATE_INVOICE) // Sales pipeline access
  createOpp(@Req() req: any, @Body() data: any) {
    return this.crmService.createOpportunity(req.user.tenantId, data);
  }

  @Get('opportunities')
  @Permissions(Permission.CREATE_INVOICE)
  getOpps(@Req() req: any) {
    return this.crmService.getOpportunities(req.user.tenantId);
  }

  @Delete('customers/:id')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  deleteCustomer(@Req() req: any, @Param('id') id: string) {
    return this.crmService.deleteCustomer(req.user.tenantId, id);
  }

  @Get('export-csv')
  @Permissions(Permission.VIEW_REPORTS)
  async exportCsv(@Req() req: any) {
    return this.crmService.exportCustomers(req.user.tenantId);
  }

  @Post('opportunities/:id')
  @Permissions(Permission.CREATE_INVOICE)
  updateOpp(@Req() req: any, @Body() data: any, @Param('id') id: string) {
    return this.crmService.updateOpportunity(req.user.tenantId, id, data);
  }

  // --- Opening Balances ---
  @Post('customers/:id/opening-balance')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  addOpeningBalance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.crmService.addOpeningBalance(req.user.tenantId, id, data);
  }

  @Get('customers/:id/opening-balances')
  @Permissions(Permission.VIEW_PRODUCTS)
  getOpeningBalances(@Req() req: any, @Param('id') id: string) {
    return this.crmService.getOpeningBalances(req.user.tenantId, id);
  }
}
