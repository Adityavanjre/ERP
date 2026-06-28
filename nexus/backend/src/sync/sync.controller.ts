import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DeviceTrustGuard } from '../common/guards/device-trust.guard';
import { Module } from '../common/decorators/module.decorator';



@Controller('sync')
@Module('sync')
@UseGuards(JwtAuthGuard, PermissionsGuard, DeviceTrustGuard)
@Module('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async push(@Req() req: any, @Body() body: { changes: any[] }) {
    return this.syncService.push(req.user.tenantId, body.changes);
  }

  @Get('pull')
  async pull(
    @Req() req: any,
    @Query('since') since: string,
    @Query('tables') tables: string,
  ) {
    const tableList = tables
      ? tables.split(',')
      : ['products', 'suppliers', 'customers'];
    const records = await this.syncService.pull(
      req.user.tenantId,
      since,
      tableList,
    );
    return { records, serverTimestamp: new Date().toISOString() };
  }

  @Get('status')
  async status(@Req() req: any) {
    return this.syncService.getStatus(req.user.tenantId);
  }

  @Post('resolve')
  async resolve(@Req() req: any, @Body() body: { conflicts: any[] }) {
    return { resolved: body.conflicts?.length || 0 };
  }

  @Post('analytics')
  async analytics(
    @Req() req: any,
    @Body() body: { events: Array<any> },
  ) {
    const events = body.events || [];
    for (const event of events) {
      await this.syncService.trackAnalytics(req.user.tenantId, req.user.sub, event);
    }
    return { status: 'ok', tracked: events.length };
  }

  @Get('metadata')
  async metadata(@Req() req: any) {
    return this.syncService.getMetadata(req.user.tenantId, req.user.sub);
  }

  @Post('audit')
  async audit(@Req() req: any, @Body() body: { logs: any[] }) {
    return this.syncService.pushAuditLogs(req.user.tenantId, req.user.sub, body.logs);
  }
}
