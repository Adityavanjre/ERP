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
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Module } from '../common/decorators/module.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('sync')
@Module('sync')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
  )
  async push(@Req() req: any, @Body() body: { changes: any[] }) {
    return this.syncService.push(req.user.tenantId, body.changes);
  }

  @Get('pull')
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
  )
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
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
  )
  async status(@Req() req: any) {
    return this.syncService.getStatus(req.user.tenantId);
  }

  @Post('resolve')
  @Roles(Role.Owner, Role.Manager)
  async resolve(@Req() req: any, @Body() body: { conflicts: any[] }) {
    return { resolved: body.conflicts?.length || 0 };
  }

  @Post('analytics')
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
  )
  async analytics(
    @Req() req: any,
    @Body()
    body: {
      events: Array<{
        eventType: string;
        eventName: string;
        metadata?: Record<string, unknown>;
        sessionId?: string;
        platform?: string;
      }>;
    },
  ) {
    const events = body.events || [];
    for (const event of events) {
      await this.syncService.trackAnalytics(
        req.user.tenantId,
        req.user.sub,
        event,
      );
    }
    return { accepted: events.length };
  }
}
