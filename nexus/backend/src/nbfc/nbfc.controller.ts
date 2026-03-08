import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NbfcService } from './nbfc.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ModuleGuard } from '../common/guards/module.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Permission } from '../common/constants/permissions';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Module } from '../common/decorators/module.decorator';
import {
  LoanApplicationDto,
  LoanDisbursementDto,
  KycSubmitDto,
} from './dto/nbfc.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, ModuleGuard)
@Module('nbfc')
@Controller('nbfc')
export class NbfcController {
  constructor(private readonly nbfcService: NbfcService) {}

  @Post('loans')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_CUSTOMERS)
  apply(@Req() req: any, @Body() data: LoanApplicationDto) {
    return this.nbfcService.applyForLoan(req.user.tenantId, data);
  }

  @Patch('loans/:id/approve')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_CUSTOMERS)
  approve(@Req() req: any, @Param('id') id: string) {
    return this.nbfcService.approveLoan(req.user.tenantId, id);
  }

  @Post('loans/:id/disburse')
  @Roles(Role.Owner, Role.Accountant)
  @Permissions(Permission.CREATE_INVOICE)
  disburse(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: LoanDisbursementDto,
  ) {
    return this.nbfcService.disburseLoan(req.user.tenantId, id, data);
  }

  @Patch('kyc/:loanId/status')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_CUSTOMERS)
  updateKYC(
    @Req() req: any,
    @Param('loanId') loanId: string,
    @Body('status') status: string,
  ) {
    return this.nbfcService.updateKYCStatus(req.user.tenantId, loanId, status);
  }

  @Post('kyc/:loanId')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_CUSTOMERS)
  submitKYC(
    @Req() req: any,
    @Param('loanId') loanId: string,
    @Body() data: KycSubmitDto,
  ) {
    return this.nbfcService.submitKYC(req.user.tenantId, loanId, data);
  }

  @Post('loans/:id/recalculate')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.VIEW_REPORTS)
  recalculate(
    @Req() req: any,
    @Param('id') id: string,
    @Body('newRate') newRate: number,
  ) {
    return this.nbfcService.recalculateLoanSchedule(
      req.user.tenantId,
      id,
      newRate,
    );
  }

  @Post('interest-accrual')
  @Roles(Role.Owner, Role.Accountant)
  @Permissions(Permission.VIEW_REPORTS)
  runAccrual(@Req() req: any) {
    return this.nbfcService.runDailyInterestAccrual(req.user.tenantId);
  }
}
