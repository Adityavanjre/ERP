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
  ) { }

  @Get('health-score')
  @Roles(Role.Owner)
  @Permissions(Permission.ACCESS_HEALTH_CORE)
  getHealthScore(@Req() req: any) {
    return this.saas.getClientHealthScore(req.user.tenantId);
  }

  @Get('leaderboard')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getLeaderboard(@Req() req: any) {
    return this.saas.getStaffLeaderboard(req.user.tenantId);
  }

  @Get('recovery-memory')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getRecoveryMemory(@Req() req: any) {
    return this.saas.getRecoveryMemory(req.user.tenantId);
  }

  @Post('accounts')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.MANAGE_USERS)
  createAccount(@Req() req: any, @Body() dto: any) {
    return this.accountingService.createAccount(req.user.tenantId, dto);
  }

  @Get('accounts')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  getAccounts(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
  ) {
    return this.accountingService.getAccounts(
      req.user.tenantId,
      Number(page) || 1,
      Number(limit) || 100,
      isActive === 'true',
    );
  }

  @Post('journals')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @PlanLimit('maxLedgerEntries')
  createJournal(@Req() req: any, @Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(req.user.tenantId, dto);
  }

  @Post('invoices')
  @Roles(Role.Owner, Role.Manager, Role.CA, Role.Biller)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxInvoicesPerMonth')
  createInvoice(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    return this.accountingService.createInvoice(req.user.tenantId, dto);
  }

  @Post('invoices/bulk')
  @Roles(Role.Owner, Role.Manager, Role.CA, Role.Biller)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxInvoicesPerMonth')
  createInvoicesBulk(@Req() req: any, @Body() dto: any[]) {
    return this.accountingService.createInvoicesBulk(req.user.tenantId, dto);
  }

  @Get('invoices')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
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

  @Get('invoices/:id')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  getInvoice(@Req() req: any, @Param('id') id: string) {
    return this.accountingService.getInvoiceById(req.user.tenantId, id);
  }

  @Post('payments')
  @Roles(Role.Owner, Role.Manager, Role.CA, Role.Biller)
  @Permissions(Permission.RECORD_PAYMENT)
  @PlanLimit('maxLedgerEntries')
  createPayment(@Req() req: any, @Body() dto: CreatePaymentDto) {
    return this.accountingService.createPayment(req.user.tenantId, dto);
  }
  @Get('ledger/:customerId')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getLedger(@Req() req: any, @Param('customerId') customerId: string) {
    return this.accountingService.getCustomerLedger(req.user.tenantId, customerId);
  }


  @Post('credit-notes')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxLedgerEntries')
  createCreditNote(@Req() req: any, @Body() dto: CreateCreditNoteDto) {
    return this.accountingService.createCreditNote(req.user.tenantId, dto);
  }

  @Get('credit-notes')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  getCreditNotes(@Req() req: any) {
    return this.accountingService.getCreditNotes(req.user.tenantId);
  }

  @Post('debit-notes')
  @Roles(Role.Owner, Role.Manager, Role.CA)
  @Permissions(Permission.CREATE_INVOICE)
  @PlanLimit('maxLedgerEntries')
  createDebitNote(@Req() req: any, @Body() dto: CreateDebitNoteDto) {
    return this.accountingService.createDebitNote(req.user.tenantId, dto);
  }

  @Get('debit-notes')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  getDebitNotes(@Req() req: any) {
    return this.accountingService.getDebitNotes(req.user.tenantId);
  }

  @Post('customers/:id/opening-balance')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  createCustomerOpeningBalance(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.accountingService.createCustomerOpeningBalance(req.user.tenantId, { ...dto, customerId: id });
  }

  @Post('suppliers/:id/opening-balance')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  createSupplierOpeningBalance(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.accountingService.createSupplierOpeningBalance(req.user.tenantId, { ...dto, supplierId: id });
  }

  @Get('suppliers/:id/ledger')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getSupplierLedger(@Req() req: any, @Param('id') id: string) {
    return this.accountingService.getSupplierLedger(req.user.tenantId, id);
  }

  @Get('transactions')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
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

  @Get('transactions/export-csv')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  @PlanLimit('maxExportsPerDay')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=general_ledger.csv')
  exportTransactionsCsv(@Req() req: any) {
    const stream = this.accountingService.exportTransactionsCsvStream(req.user.tenantId);
    const { Readable } = require('stream');
    const { StreamableFile } = require('@nestjs/common');
    return new StreamableFile(Readable.from(stream));
  }

  @Get('stats')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: any) {
    return this.accountingService.getStats(req.user.tenantId);
  }

  @Get('export/tally')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  @Permissions(Permission.EXPORT_TALLY)
  @PlanLimit('maxExportsPerDay')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename=tally_export.xml')
  getTallyExport(
    @Req() req: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const stream = this.accountingService.exportTallyXmlStream(
      req.user.tenantId,
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
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  @Permissions(Permission.EXPORT_TALLY)
  @PlanLimit('maxExportsPerDay')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename=tally_masters.xml')
  getLedgerMasters(@Req() req: any) {
    const stream = this.accountingService.exportLedgerMastersStream(req.user.tenantId);
    const { Readable } = require('stream');
    const { StreamableFile } = require('@nestjs/common');
    return new StreamableFile(Readable.from(stream));
  }

  @Get('auditor/dashboard')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
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
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.MANAGE_USERS)
  initializeAccounts(@Req() req: any) {
    return this.accountingService.initializeTenantAccounts(req.user.tenantId);
  }

  @Post('import/trial-balance')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.MANAGE_USERS)
  importTrialBalance(@Req() req: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.accountingService.importTrialBalance(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Post('invoices/:id/cancel')
  @Roles(Role.Owner, Role.CA, Role.Manager)
  @Permissions(Permission.CREATE_INVOICE)
  async cancelInvoice(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.accountingService.cancelInvoice(req.user.tenantId, id, reason);
  }

  @Get('reports/trial-balance')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getTrialBalance(
    @Req() req: any,
    @Query('isActiveOnly') isActiveOnly?: string,
  ) {
    return this.accountingService.getTrialBalance(
      req.user.tenantId,
      isActiveOnly === 'true',
    );
  }

  @Get('reports/profit-loss')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getProfitLoss(@Req() req: any) {
    return this.accountingService.getProfitLoss(req.user.tenantId);
  }

  // --- Fixed Assets ---
  @Get('fixed-assets')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getFixedAssets(@Req() req: any) {
    return this.accountingService.getFixedAssets(req.user.tenantId);
  }

  @Post('import/fixed-assets')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.MANAGE_USERS)
  importFixedAssets(@Req() req: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.accountingService.importFixedAssets(
      req.user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  @Post('fixed-assets')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.CREATE_INVOICE)
  createFixedAsset(@Req() req: any, @Body() body: CreateFixedAssetDto) {
    return this.accountingService.createFixedAsset(req.user.tenantId, body);
  }

  @Post('fixed-assets/:id/depreciate')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  runDepreciation(@Req() req: any, @Param('id') id: string) {
    return this.accountingService.runMonthlyDepreciation(req.user.tenantId, id);
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
      req.user.tenantId,
      month,
      year,
      req.user.id,
    );
  }

  @Post('unlock-period')
  @Roles(Role.Owner, Role.CA)
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
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.LOCK_MONTH)
  @MfaRequired()
  closeFinancialYear(@Req() req: any, @Body('year') year: number) {
    return this.accountingService.closeFinancialYear(
      req.user.tenantId,
      year,
      req.user.id,
    );
  }

  @Get('export/gstr1')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.EXPORT_TALLY)
  @PlanLimit('maxExportsPerDay')
  exportGstr1(
    @Req() req: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    // GST-002: Return GSTN offline utility schema JSON
    const today = new Date();
    return this.gstr1.generateGstr1Json(
      req.user.tenantId,
      month ? Number(month) : today.getMonth() + 1,
      year ? Number(year) : today.getFullYear(),
    );
  }
}
