import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { TdsService } from '../services/tds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('accounting/tds')
@UseGuards(JwtAuthGuard)
export class TdsController {
    constructor(private readonly tdsService: TdsService) { }

    @Get('report/vendor-wise')
    async getVendorWiseReport(@Req() req: any) {
        return this.tdsService.getVendorWiseReport(req.user.tenantId);
    }

    @Get('report/section-wise')
    async getSectionWiseReport(@Req() req: any) {
        return this.tdsService.getSectionWiseReport(req.user.tenantId);
    }

    @Get('summary/payable')
    async getTdsPayableSummary(@Req() req: any) {
        return this.tdsService.getTdsPayableSummary(req.user.tenantId);
    }
}
