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
  UseInterceptors,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { SaasAnalyticsService } from '../system/services/saas-analytics.service';
import { CollaborationService } from '../system/services/collaboration.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateJournalEntryDto } from './dto/create-journal.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateCreditNoteDto, CreateDebitNoteDto } from './dto/create-note.dto';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

import { Module } from '../common/decorators/module.decorator';
import { MfaGuard } from '../common/guards/mfa.guard';
import { MfaRequired } from '../common/decorators/mfa-required.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, MfaGuard)
@Module('accounting')
@Controller('accounting')
@UseInterceptors(AuditInterceptor)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly saas: SaasAnalyticsService,
    private readonly collaboration: CollaborationService,
  ) { }

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
  createInvoice(@Req() req: any, @Body() dto: CreateInvoiceDto) {
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
    return this.accountingService.getCustomerLedger(req.user.tenantId, customerId);
  }


  @Post('credit-notes')
  @Permissions(Permission.CREATE_INVOICE)
  createCreditNote(@Req() req: any, @Body() dto: CreateCreditNoteDto) {
    return this.accountingService.createCreditNote(req.user.tenantId, dto);
  }

  @Get('credit-notes')
  @Permissions(Permission.VIEW_PRODUCTS)
  getCreditNotes(@Req() req: any) {
    return this.accountingService.getCreditNotes(req.user.tenantId);
  }

  @Post('debit-notes')
  @Permissions(Permission.CREATE_INVOICE)
  createDebitNote(@Req() req: any, @Body() dto: CreateDebitNoteDto) {
    return this.accountingService.createDebitNote(req.user.tenantId, dto);
  }

  @Get('debit-notes')
  @Permissions(Permission.VIEW_PRODUCTS)
  getDebitNotes(@Req() req: any) {
    return this.accountingService.getDebitNotes(req.user.tenantId);
  }

  @Post('customers/:id/opening-balance')
  @Permissions(Permission.LOCK_MONTH)
  createCustomerOpeningBalance(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.accountingService.createCustomerOpeningBalance(req.user.tenantId, { ...dto, customerId: id });
  }

  @Post('suppliers/:id/opening-balance')
  @Permissions(Permission.LOCK_MONTH)
  createSupplierOpeningBalance(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.accountingService.createSupplierOpeningBalance(req.user.tenantId, { ...dto, supplierId: id });
  }

  @Get('suppliers/:id/ledger')
  @Permissions(Permission.VIEW_REPORTS)
  getSupplierLedger(@Req() req: any, @Param('id') id: string) {
    return this.accountingService.getSupplierLedger(req.user.tenantId, id);
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

  @Post('setup/coa')
  @Permissions(Permission.MANAGE_USERS)
  initializeAccounts(@Req() req: any) {
    return this.accountingService.initializeTenantAccounts(req.user.tenantId);
  }

  @Post('import/trial-balance')
  @Permissions(Permission.MANAGE_USERS)
  importTrialBalance(@Req() req: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.accountingService.ledger.importTrialBalance(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Post('invoices/:id/cancel')
  @Permissions(Permission.CREATE_INVOICE)
  async cancelInvoice(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.accountingService.cancelInvoice(req.user.tenantId, id, reason);
  }

  @Get('reports/trial-balance')
  @Permissions(Permission.VIEW_REPORTS)
  getTrialBalance(@Req() req: any) {
    return this.accountingService.getTrialBalance(req.user.tenantId);
  }

  @Get('reports/profit-loss')
  @Permissions(Permission.VIEW_REPORTS)
  getProfitLoss(@Req() req: any) {
    return this.accountingService.getProfitLoss(req.user.tenantId);
  }

  // --- Fixed Assets ---
  @Get('fixed-assets')
  @Permissions(Permission.VIEW_REPORTS)
  getFixedAssets(@Req() req: any) {
    return this.accountingService.getFixedAssets(req.user.tenantId);
  }

  @Post('import/fixed-assets')
  @Permissions(Permission.MANAGE_USERS)
  importFixedAssets(@Req() req: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.accountingService.importFixedAssets(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Post('fixed-assets')
  @Permissions(Permission.CREATE_INVOICE)
  createFixedAsset(@Req() req: any, @Body() body: CreateFixedAssetDto) {
    return this.accountingService.createFixedAsset(req.user.tenantId, body);
  }

  @Post('fixed-assets/:id/depreciate')
  @Permissions(Permission.VIEW_REPORTS)
  runDepreciation(@Req() req: any, @Param('id') id: string) {
    return this.accountingService.runMonthlyDepreciation(req.user.tenantId, id);
  }

  @Post('lock-period')
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  lockPeriod(
    @Req() req: any,
    @Body('month') month: number,
    @Body('year') year: number,
  ) {
    return this.accountingService.lockPeriod(
      req.user.tenantId,
      month,
      year,
      req.user.id,
    );
  }

  @Post('unlock-period')
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  unlockPeriod(
    @Req() req: any,
    @Body('month') month: number,
    @Body('year') year: number,
    @Body('reason') reason: string,
  ) {
    return this.accountingService.unlockPeriod(
      req.user.tenantId,
      month,
      year,
      reason,
    );
  }

  @Post('close-year')
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  closeFinancialYear(@Req() req: any, @Body('year') year: number) {
    return this.accountingService.closeFinancialYear(
      req.user.tenantId,
      year,
      req.user.id,
    );
  }
}

