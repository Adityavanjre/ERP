import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BrsService } from '../services/brs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/constants/permissions';
import { Module } from '../../common/decorators/module.decorator';
import { UploadBrsStatementDto } from '../dto/brs.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@Controller('accounting/brs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Module('accounting')
export class BrsController {
  constructor(private brsService: BrsService) {}

  @Post('upload/:accountId')
  @Roles('Accountant', 'Owner', 'CA')
  @Permissions(Permission.RECORD_PAYMENT)
  async uploadStatement(
    @Req() req: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Body() data: UploadBrsStatementDto,
  ) {
    return this.brsService.uploadStatement(
      req.user.tenantId as string,
      accountId,
      data,
    );
  }

  @Post('auto-match/:statementId')
  @Roles('Accountant', 'Owner', 'CA')
  @Permissions(Permission.RECORD_PAYMENT)
  async autoMatch(
    @Req() req: AuthenticatedRequest,
    @Param('statementId') statementId: string,
  ) {
    return this.brsService.autoMatch(req.user.tenantId as string, statementId);
  }

  @Post('manual-match')
  @Roles('Accountant', 'Owner', 'CA')
  @Permissions(Permission.RECORD_PAYMENT)
  async manualMatch(
    @Req() req: AuthenticatedRequest,
    @Body() body: { lineId: string; transactionId: string },
  ) {
    return this.brsService.manualMatch(
      req.user.tenantId as string,
      body.lineId,
      body.transactionId,
    );
  }

  @Get('report/:accountId')
  @Roles('Accountant', 'Owner', 'CA')
  @Permissions(Permission.VIEW_REPORTS)
  async getReport(
    @Req() req: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Query('endDate') endDateStr: string,
  ) {
    return this.brsService.getReconciliationReport(
      req.user.tenantId as string,
      accountId,
      endDateStr,
    );
  }

  @Get('statement/:statementId')
  @Roles('Accountant', 'Owner', 'CA')
  @Permissions(Permission.VIEW_REPORTS)
  async getStatementDetails(
    @Req() req: AuthenticatedRequest,
    @Param('statementId') statementId: string,
  ) {
    return this.brsService.getStatementDetails(
      req.user.tenantId as string,
      statementId,
    );
  }
}
