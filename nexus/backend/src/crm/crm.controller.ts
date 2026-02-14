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
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('customers')
  create(@Req() req: any, @Body() createCustomerDto: any) {
    return this.crmService.createCustomer(req.user.tenantId, createCustomerDto);
  }

  @Post('import')
  uploadFile(@Req() req: any, @Body() body: any) {
    // Basic text/csv handling
    const csvContent = body.csv || body;
    return this.crmService.importCustomers(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Get('customers')
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
  getStats(@Req() req: any) {
    return this.crmService.getStats(req.user.tenantId);
  }

  @Post('opportunities')
  createOpp(@Req() req: any, @Body() data: any) {
    return this.crmService.createOpportunity(req.user.tenantId, data);
  }

  @Get('opportunities')
  getOpps(@Req() req: any) {
    return this.crmService.getOpportunities(req.user.tenantId);
  }

  @Delete('customers/:id')
  @Roles(Role.Owner, Role.Manager)
  deleteCustomer(@Req() req: any, @Param('id') id: string) {
    return this.crmService.deleteCustomer(req.user.tenantId, id);
  }

  @Get('export-csv')
  async exportCsv(@Req() req: any) {
    return this.crmService.exportCustomers(req.user.tenantId);
  }

  @Post('opportunities/:id')
  updateOpp(@Req() req: any, @Body() data: any, @Param('id') id: string) {
    return this.crmService.updateOpportunity(req.user.tenantId, id, data);
  }

  // --- Opening Balances ---
  @Post('customers/:id/opening-balance')
  @Roles(Role.Owner, Role.Manager)
  addOpeningBalance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.crmService.addOpeningBalance(req.user.tenantId, id, data);
  }

  @Get('customers/:id/opening-balances')
  getOpeningBalances(@Req() req: any, @Param('id') id: string) {
    return this.crmService.getOpeningBalances(req.user.tenantId, id);
  }
}
