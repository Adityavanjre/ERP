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
import { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CreateAccountDto } from './dto/create-account.dto';

import { Module } from '../common/decorators/module.decorator';
import { MfaGuard } from '../common/guards/mfa.guard';
import { MfaRequired } from '../common/decorators/mfa-required.decorator';
import { PlanLimit } from '../common/guards/plan.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Gstr1ExportService } from './services/gstr1-export.service';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, MfaGuard)
@Module('accounting')
@Controller('accounting')
@UseInterceptors(AuditInterceptor)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly saas: SaasAnalyticsService,
    private readonly collaboration: CollaborationService,
    private readonly gstr1: Gstr1ExportService,
  ) {}

  @Get('health-score')
  @Roles(Role.Owner)
  @Permissions(Permission.ACCESS_HEALTH_CORE)
  getHealthScore(@Req() req: AuthenticatedRequest) {
    return this.saas.getClientHealthScore(req.user.tenantId as string);
  }

  @Get('leaderboard')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getLeaderboard(@Req() req: AuthenticatedRequest) {
    return this.saas.getStaffLeaderboard(req.user.tenantId as string);
  }

  @Get('recovery-memory')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getRecoveryMemory(@Req() req: AuthenticatedRequest) {
    return this.saas.getRecoveryMemory(req.user.tenantId as string);
  }

  @Post('accounts')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.MANAGE_ACCOUNTS)
  createAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountingService.createAccount(
      req.user.tenantId as string,
      dto,
    );
  }

  @Get('accounts')
  @Permissions(Permission.VIEW_REPORTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getAccounts(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
  ) {
    return this.accountingService.getAccounts(
      req.user.tenantId as string,
      Number(page) || 1,
      Number(limit) || 100,
      isActive === 'true',
    );
  }

  @Post('journals')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @PlanLimit('maxLedgerEntries')
  createJournal(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.accountingService.createJournalEntry(
      req.user.tenantId as string,
      dto,
    );
  }

  @Post('invoices')
  @Roles(Role.Owner, Role.Manager, Role.CA, Role.Biller)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxInvoicesPerMonth')
  createInvoice(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.accountingService.createInvoice(
      req.user.tenantId as string,
      dto,
    );
  }

  @Post('invoices/bulk')
  @Roles(Role.Owner, Role.Manager, Role.CA, Role.Biller)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxInvoicesPerMonth')
  createInvoicesBulk(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInvoiceDto[],
  ) {
    return this.accountingService.createInvoicesBulk(
      req.user.tenantId as string,
      dto,
    );
  }

  @Get('invoices')
  @Permissions(Permission.VIEW_REPORTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getInvoices(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.accountingService.getInvoices(
      req.user.tenantId as string,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Get('invoices/:id')
  @Permissions(Permission.VIEW_REPORTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getInvoice(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.accountingService.getInvoiceById(
      req.user.tenantId as string,
      id,
    );
  }

  @Post('payments')
  @Roles(Role.Owner, Role.Manager, Role.CA, Role.Biller)
  @Permissions(Permission.RECORD_PAYMENT)
  @PlanLimit('maxLedgerEntries')
  createPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.accountingService.createPayment(
      req.user.tenantId as string,
      dto,
    );
  }
  @Get('ledger/:customerId')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getLedger(
    @Req() req: AuthenticatedRequest,
    @Param('customerId') customerId: string,
  ) {
    return this.accountingService.getCustomerLedger(
      req.user.tenantId as string,
      customerId,
    );
  }

  @Post('credit-notes')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxLedgerEntries')
  createCreditNote(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCreditNoteDto,
  ) {
    return this.accountingService.createCreditNote(
      req.user.tenantId as string,
      dto,
    );
  }

  @Get('credit-notes')
  @Permissions(Permission.VIEW_REPORTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getCreditNotes(@Req() req: AuthenticatedRequest) {
    return this.accountingService.getCreditNotes(req.user.tenantId as string);
  }

  @Post('debit-notes')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxLedgerEntries')
  createDebitNote(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDebitNoteDto,
  ) {
    return this.accountingService.createDebitNote(
      req.user.tenantId as string,
      dto,
    );
  }

  @Get('debit-notes')
  @Permissions(Permission.VIEW_REPORTS)
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  getDebitNotes(@Req() req: AuthenticatedRequest) {
    return this.accountingService.getDebitNotes(req.user.tenantId as string);
  }

  @Post('customers/:id/opening-balance')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  createCustomerOpeningBalance(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.accountingService.createCustomerOpeningBalance(
      req.user.tenantId as string,
      { ...dto, customerId: id },
    );
  }

  @Post('suppliers/:id/opening-balance')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  createSupplierOpeningBalance(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.accountingService.createSupplierOpeningBalance(
      req.user.tenantId as string,
      { ...dto, supplierId: id },
    );
  }

  @Get('suppliers/:id/ledger')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getSupplierLedger(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.accountingService.getSupplierLedger(
      req.user.tenantId as string,
      id,
    );
  }

  @Get('transactions')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.accountingService.getTransactions(
      req.user.tenantId as string,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Get('transactions/export-csv')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  @PlanLimit('maxExportsPerDay')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=general_ledger.csv')
  exportTransactionsCsv(@Req() req: AuthenticatedRequest) {
    const stream = this.accountingService.exportTransactionsCsvStream(
      req.user.tenantId as string,
    );
    const { Readable } = require('stream');
    const { StreamableFile } = require('@nestjs/common');
    return new StreamableFile(Readable.from(stream));
  }

  @Get('stats')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: AuthenticatedRequest) {
    return this.accountingService.getStats(req.user.tenantId as string);
  }

  @Get('export/tally')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  @Permissions(Permission.EXPORT_TALLY)
  @PlanLimit('maxExportsPerDay')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename=tally_export.xml')
  getTallyExport(
    @Req() req: AuthenticatedRequest,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const stream = this.accountingService.exportTallyXmlStream(
      req.user.tenantId as string,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
    // Requires import { StreamableFile } from '@nestjs/common';
    // Requires import { Readable } from 'stream';
    const { Readable } = require('stream');
    const { StreamableFile } = require('@nestjs/common');
    return new StreamableFile(Readable.from(stream));
  }

  @Get('export/validate')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  @Permissions(Permission.EXPORT_TALLY)
  validateTally(
    @Req() req: AuthenticatedRequest,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const today = new Date();
    return this.accountingService.validateTallyData(
      req.user.tenantId as string,
      month ? Number(month) : today.getMonth() + 1,
      year ? Number(year) : today.getFullYear(),
    );
  }

  @Get('export/masters')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  @Permissions(Permission.EXPORT_TALLY)
  @PlanLimit('maxExportsPerDay')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename=tally_masters.xml')
  getLedgerMasters(@Req() req: AuthenticatedRequest) {
    const stream = this.accountingService.exportLedgerMastersStream(
      req.user.tenantId as string,
    );
    const { Readable } = require('stream');
    const { StreamableFile } = require('@nestjs/common');
    return new StreamableFile(Readable.from(stream));
  }

  @Get('auditor/dashboard')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getAuditorDashboard(
    @Req() req: AuthenticatedRequest,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const today = new Date();
    return this.accountingService.getAuditorDashboard(
      req.user.tenantId as string,
      month ? Number(month) : today.getMonth() + 1,
      year ? Number(year) : today.getFullYear(),
    );
  }

  @Post('auditor/lock')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  lockAuditor(
    @Req() req: AuthenticatedRequest,
    @Body('month') month: number,
    @Body('year') year: number,
  ) {
    return this.accountingService.togglePeriodLock(
      req.user.tenantId as string,
      Number(month),
      Number(year),
      req.user.sub,
      'LOCK',
    );
  }

  @Post('auditor/unlock')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  unlockAuditor(
    @Req() req: AuthenticatedRequest,
    @Body('month') month: number,
    @Body('year') year: number,
    @Body('reason') reason?: string,
  ) {
    return this.accountingService.togglePeriodLock(
      req.user.tenantId as string,
      Number(month),
      Number(year),
      req.user.sub,
      'UNLOCK',
      reason,
    );
  }

  @Post('setup/coa')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.MANAGE_ACCOUNTS)
  initializeAccounts(@Req() req: AuthenticatedRequest) {
    return this.accountingService.initializeTenantAccounts(
      req.user.tenantId as string,
    );
  }

  @Post('import/trial-balance')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.MANAGE_ACCOUNTS)
  importTrialBalance(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.accountingService.importTrialBalance(
      req.user.tenantId as string,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Post('invoices/:id/cancel')
  @Roles(Role.Owner, Role.CA, Role.Manager)
  @Permissions(Permission.CREATE_INVOICE)
  async cancelInvoice(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.accountingService.cancelInvoice(
      req.user.tenantId as string,
      id,
      reason,
    );
  }

  @Get('reports/trial-balance')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getTrialBalance(
    @Req() req: AuthenticatedRequest,
    @Query('isActiveOnly') isActiveOnly?: string,
  ) {
    return this.accountingService.getTrialBalance(
      req.user.tenantId as string,
      isActiveOnly === 'true',
    );
  }

  @Get('reports/profit-loss')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getProfitLoss(@Req() req: AuthenticatedRequest) {
    return this.accountingService.getProfitLoss(req.user.tenantId as string);
  }

  // --- Fixed Assets ---
  @Get('fixed-assets')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getFixedAssets(@Req() req: AuthenticatedRequest) {
    return this.accountingService.getFixedAssets(req.user.tenantId as string);
  }

  @Post('import/fixed-assets')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.MANAGE_ACCOUNTS)
  importFixedAssets(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.accountingService.importFixedAssets(
      req.user.tenantId as string,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Post('fixed-assets')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.CREATE_INVOICE)
  createFixedAsset(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateFixedAssetDto,
  ) {
    return this.accountingService.createFixedAsset(
      req.user.tenantId as string,
      body,
    );
  }

  @Post('fixed-assets/:id/depreciate')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  runDepreciation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.accountingService.runMonthlyDepreciation(
      req.user.tenantId as string,
      id,
    );
  }

  @Post('lock-period')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  lockPeriod(
    @Req() req: any,
    @Body('month') month: number,
    @Body('year') year: number,
  ) {
    return this.accountingService.lockPeriod(
      req.user.tenantId as string,
      month,
      year,
      req.user.sub,
    );
  }

  @Post('unlock-period')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  unlockPeriod(
    @Req() req: AuthenticatedRequest,
    @Body('month') month: number,
    @Body('year') year: number,
    @Body('reason') reason: string,
  ) {
    return this.accountingService.unlockPeriod(
      req.user.tenantId as string,
      month,
      year,
      reason,
    );
  }

  @Post('close-year')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  closeFinancialYear(
    @Req() req: AuthenticatedRequest,
    @Body('year') year: number,
  ) {
    return this.accountingService.closeFinancialYear(
      req.user.tenantId as string,
      year,
      req.user.sub,
    );
  }

  @Get('export/gstr1')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.EXPORT_TALLY)
  @PlanLimit('maxExportsPerDay')
  exportGstr1(
    @Req() req: AuthenticatedRequest,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    // GST-002: Return GSTN offline utility schema JSON
    const today = new Date();
    return this.gstr1.generateGstr1Json(
      req.user.tenantId as string,
      month ? Number(month) : today.getMonth() + 1,
      year ? Number(year) : today.getFullYear(),
    );
  }
}
