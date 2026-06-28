import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { TdsService } from '../services/tds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';


import { Permissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/constants/permissions';
import { Module } from '../../common/decorators/module.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@Controller('accounting/tds')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Module('accounting')
export class TdsController {
  constructor(private readonly tdsService: TdsService) {}

  @Get('report/vendor-wise')
  @Permissions(Permission.VIEW_REPORTS)
  async getVendorWiseReport(@Req() req: AuthenticatedRequest) {
    return this.tdsService.getVendorWiseReport(req.user.tenantId as string);
  }

  @Get('report/section-wise')
  @Permissions(Permission.VIEW_REPORTS)
  async getSectionWiseReport(@Req() req: AuthenticatedRequest) {
    return this.tdsService.getSectionWiseReport(req.user.tenantId as string);
  }

  @Get('summary/payable')
  @Permissions(Permission.VIEW_REPORTS)
  async getTdsPayableSummary(@Req() req: AuthenticatedRequest) {
    return this.tdsService.getTdsPayableSummary(req.user.tenantId as string);
  }
}
