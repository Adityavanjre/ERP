import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { Module } from '../common/decorators/module.decorator';
import { MobileAction } from '../common/decorators/mobile-action.decorator';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  UpdateCustomerDto,
  AddOpeningBalanceDto,
} from './dto/crm.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Module('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) { }

  @Post('customers')
  @Permissions(Permission.MANAGE_USERS)
  create(@Req() req: any, @Body() createCustomerDto: UpdateCustomerDto) {
    return this.crmService.createCustomer(req.user.tenantId, createCustomerDto);
  }

  @Post('import')
  @Permissions(Permission.MANAGE_USERS)
  uploadFile(@Req() req: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.crmService.importCustomers(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Get('customers')
  @Permissions(Permission.VIEW_PRODUCTS)
  @MobileAction('VIEW_LEADS')
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
  @Permissions(Permission.CREATE_INVOICE)
  @MobileAction('CREATE_LEAD')
  createOpp(@Req() req: any, @Body() data: CreateOpportunityDto) {
    return this.crmService.createOpportunity(req.user.tenantId, data);
  }

  @Get('opportunities')
  @Permissions(Permission.CREATE_INVOICE)
  @MobileAction('VIEW_LEADS')
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
  updateOpp(@Req() req: any, @Body() data: UpdateOpportunityDto, @Param('id') id: string) {
    return this.crmService.updateOpportunity(req.user.tenantId, id, data);
  }

  @Patch('customers/:id')
  @Permissions(Permission.MANAGE_USERS)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.crmService.updateCustomer(
      req.user.tenantId,
      id,
      updateCustomerDto,
    );
  }

  @Post('customers/:id/opening-balance')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  addOpeningBalance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: AddOpeningBalanceDto,
  ) {
    return this.crmService.addOpeningBalance(req.user.tenantId, id, data);
  }

  @Get('customers/:id/opening-balances')
  @Permissions(Permission.VIEW_PRODUCTS)
  getOpeningBalances(@Req() req: any, @Param('id') id: string) {
    return this.crmService.getOpeningBalances(req.user.tenantId, id);
  }
}
