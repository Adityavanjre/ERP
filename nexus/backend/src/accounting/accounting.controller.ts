import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  Header,
  Delete,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SaasAnalyticsService } from '../kernel/services/saas-analytics.service';
import { CollaborationService } from '../kernel/services/collaboration.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateJournalEntryDto } from './dto/create-journal.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly saas: SaasAnalyticsService,
    private readonly collaboration: CollaborationService,
  ) {}

  @Get('health-score')
  @Permissions(Permission.ACCESS_HEALTH_CORE)
  getHealthScore(@Req() req: any) {
    return this.saas.getClientHealthScore(req.user.tenantId);
  }

  @Get('leaderboard')
  @Permissions(Permission.VIEW_REPORTS)
  getLeaderboard(@Req() req: any) {
    return this.saas.getStaffLeaderboard(req.user.tenantId);
  }

  @Get('recovery-memory')
  @Permissions(Permission.VIEW_REPORTS)
  getRecoveryMemory(@Req() req: any) {
    return this.saas.getRecoveryMemory(req.user.tenantId);
  }

  @Post('accounts')
  @Permissions(Permission.MANAGE_USERS)
  createAccount(@Req() req: any, @Body() dto: any) {
    return this.accountingService.createAccount(req.user.tenantId, dto);
  }

  @Get('accounts')
  @Permissions(Permission.VIEW_PRODUCTS)
  getAccounts(@Req() req: any) {
    return this.accountingService.getAccounts(req.user.tenantId);
  }

  @Post('journals')
  @Permissions(Permission.LOCK_MONTH)
  createJournal(@Req() req: any, @Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(req.user.tenantId, dto);
  }

  @Post('invoices')
  @Permissions(Permission.CREATE_INVOICE)
  createInvoice(@Req() req: any, @Body() dto: any) {
    return this.accountingService.createInvoice(req.user.tenantId, dto);
  }

  @Post('invoices/bulk')
  @Permissions(Permission.CREATE_INVOICE)
  createInvoicesBulk(@Req() req: any, @Body() dto: any[]) {
    return this.accountingService.createInvoicesBulk(req.user.tenantId, dto);
  }

  @Get('invoices')
  @Permissions(Permission.VIEW_PRODUCTS)
  getInvoices(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.accountingService.getInvoices(
      req.user.tenantId,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Post('payments')
  @Permissions(Permission.RECORD_PAYMENT)
  createPayment(@Req() req: any, @Body() dto: CreatePaymentDto) {
    return this.accountingService.createPayment(req.user.tenantId, dto);
  }

  @Get('ledger/:customerId')
  @Permissions(Permission.VIEW_REPORTS)
  getLedger(@Req() req: any, @Param('customerId') customerId: string) {
    return this.accountingService.getCustomerLedger(
      req.user.tenantId,
      customerId,
    );
  }

  @Get('transactions')
  @Permissions(Permission.VIEW_REPORTS)
  getTransactions(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.accountingService.getTransactions(
      req.user.tenantId,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Get('stats')
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: any) {
    return this.accountingService.getStats(req.user.tenantId);
  }

  @Get('export/tally')
  @Permissions(Permission.EXPORT_TALLY)
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename=tally_export.xml')
  getTallyExport(
    @Req() req: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.accountingService.exportTallyXml(
      req.user.tenantId,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get('export/validate')
  @Permissions(Permission.EXPORT_TALLY)
  validateTally(
    @Req() req: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const today = new Date();
    return this.accountingService.validateTallyData(
      req.user.tenantId,
      month ? Number(month) : today.getMonth() + 1,
      year ? Number(year) : today.getFullYear(),
    );
  }

  @Get('export/masters')
  @Permissions(Permission.EXPORT_TALLY)
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename=tally_masters.xml')
  getLedgerMasters(@Req() req: any) {
    return this.accountingService.exportLedgerMasters(req.user.tenantId);
  }

  @Get('auditor/dashboard')
  @Permissions(Permission.VIEW_REPORTS)
  getAuditorDashboard(
    @Req() req: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const today = new Date();
    return this.accountingService.getAuditorDashboard(
      req.user.tenantId,
      month ? Number(month) : today.getMonth() + 1,
      year ? Number(year) : today.getFullYear(),
    );
  }

  @Post('auditor/lock')
  @Permissions(Permission.LOCK_MONTH)
  lockPeriod(@Req() req: any, @Body() body: any) {
    return this.accountingService.togglePeriodLock(
      req.user.tenantId,
      body.month,
      body.year,
      req.user.id,
      'LOCK',
    );
  }

  @Post('auditor/unlock')
  @Permissions(Permission.MANAGE_USERS) // Only Owner/Manager through MANAGE_USERS
  unlockPeriod(@Req() req: any, @Body() body: any) {
    return this.accountingService.togglePeriodLock(
      req.user.tenantId,
      body.month,
      body.year,
      req.user.id,
      'UNLOCK',
      body.reason,
    );
  }

  @Post('setup/coa')
  @Permissions(Permission.MANAGE_USERS)
  initializeAccounts(@Req() req: any) {
    return this.accountingService.initializeTenantAccounts(req.user.tenantId);
  }

  @Delete('invoices/:id')
  @Permissions(Permission.CREATE_INVOICE)
  async deleteInvoice(@Req() req: any, @Param('id') id: string) {
    // 1. Cascade Deletion for Discussion Threads
    await this.collaboration.deleteCommentsByResource(req.user.tenantId, 'Invoice', id);
    
    // 2. Perform actual deletion
    return this.accountingService.deleteInvoice(req.user.tenantId, id);
  }
}
