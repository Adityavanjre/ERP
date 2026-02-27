import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { BrsService } from '../services/brs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadBrsStatementDto } from '../dto/brs.dto';

@Controller('accounting/brs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrsController {
    constructor(private brsService: BrsService) { }

    @Post('upload/:accountId')
    @Roles('Accountant', 'Owner', 'CA')
    async uploadStatement(
        @Req() req: any,
        @Param('accountId') accountId: string,
        @Body() data: UploadBrsStatementDto,
    ) {
        return this.brsService.uploadStatement(req.user.tenantId, accountId, data);
    }

    @Post('auto-match/:statementId')
    @Roles('Accountant', 'Owner', 'CA')
    async autoMatch(@Req() req: any, @Param('statementId') statementId: string) {
        return this.brsService.autoMatch(req.user.tenantId, statementId);
    }

    @Post('manual-match')
    @Roles('Accountant', 'Owner', 'CA')
    async manualMatch(
        @Req() req: any,
        @Body() body: { lineId: string; transactionId: string },
    ) {
        return this.brsService.manualMatch(req.user.tenantId, body.lineId, body.transactionId);
    }

    @Get('report/:accountId')
    @Roles('Accountant', 'Owner', 'CA')
    async getReport(
        @Req() req: any,
        @Param('accountId') accountId: string,
        @Query('endDate') endDateStr: string,
    ) {
        return this.brsService.getReconciliationReport(req.user.tenantId, accountId, endDateStr);
    }

    @Get('statement/:statementId')
    @Roles('Accountant', 'Owner', 'CA')
    async getStatementDetails(@Req() req: any, @Param('statementId') statementId: string) {
        return this.brsService.getStatementDetails(req.user.tenantId, statementId);
    }
}
