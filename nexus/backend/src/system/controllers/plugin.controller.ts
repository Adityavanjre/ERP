import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PluginManager } from '../services/plugin.manager';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('system/plugins')
@UseGuards(JwtAuthGuard, RolesGuard, AdminGuard)
@Roles(Role.Owner) // Virtual Role for Admins mapped in RolesGuard
export class PluginController {
  constructor(
    private readonly pluginManager: PluginManager,
    private readonly prisma: PrismaService,
  ) { }

  @Get()
  async listPlugins() {
    return this.prisma.plugin.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Patch(':id/toggle')
  async togglePlugin(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.pluginManager.togglePlugin(id, isActive);
  }

  @Get('active')
  async getActive() {
    return this.pluginManager.getActivePlugins();
  }
}
