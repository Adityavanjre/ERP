import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { TdsService } from '../services/tds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/constants/permissions';
import { Module } from '../../common/decorators/module.decorator';

@Controller('accounting/tds')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Module('accounting')
export class TdsController {
    constructor(private readonly tdsService: TdsService) { }

    @Get('report/vendor-wise')
    @Roles(Role.Owner)
    @Permissions(Permission.VIEW_REPORTS)
    async getVendorWiseReport(@Req() req: any) {
        return this.tdsService.getVendorWiseReport(req.user.tenantId);
    }

    @Get('report/section-wise')
    @Roles(Role.Owner)
    @Permissions(Permission.VIEW_REPORTS)
    async getSectionWiseReport(@Req() req: any) {
        return this.tdsService.getSectionWiseReport(req.user.tenantId);
    }

    @Get('summary/payable')
    @Roles(Role.Owner)
    @Permissions(Permission.VIEW_REPORTS)
    async getTdsPayableSummary(@Req() req: any) {
        return this.tdsService.getTdsPayableSummary(req.user.tenantId);
    }
}
