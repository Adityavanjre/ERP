import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { TdsService } from '../services/tds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('accounting/tds')
@UseGuards(JwtAuthGuard)
export class TdsController {
    constructor(private readonly tdsService: TdsService) { }

    @Get('report/vendor-wise')
    @Roles(Role.Owner)
    async getVendorWiseReport(@Req() req: any) {
        return this.tdsService.getVendorWiseReport(req.user.tenantId);
    }

    @Get('report/section-wise')
    @Roles(Role.Owner)
    async getSectionWiseReport(@Req() req: any) {
        return this.tdsService.getSectionWiseReport(req.user.tenantId);
    }

    @Get('summary/payable')
    @Roles(Role.Owner)
    async getTdsPayableSummary(@Req() req: any) {
        return this.tdsService.getTdsPayableSummary(req.user.tenantId);
    }
}
