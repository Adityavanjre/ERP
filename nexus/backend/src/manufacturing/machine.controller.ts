import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { MachineService } from './machine.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { MachineStatus } from '@prisma/client';

import { CreateMachineDto, UpdateMachineDto } from './dto/manufacturing.dto';

import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { Module } from '../common/decorators/module.decorator';

@UseGuards(JwtAuthGuard,  PermissionsGuard)
@Module('manufacturing')
@UseInterceptors(AuditInterceptor)
@Controller('manufacturing/machines')
export class MachineController {
  constructor(private readonly machineService: MachineService) {}

  @Post()
  @Permissions(Permission.ADJUST_STOCK)
  create(@Req() req: any, @Body() data: CreateMachineDto) {
    return this.machineService.createMachine(req.user.tenantId, data);
  }

  @Get()
  @Permissions(Permission.VIEW_PRODUCTS)
  findAll(@Req() req: any) {
    return this.machineService.getMachines(req.user.tenantId);
  }

  @Patch(':id')
  @Permissions(Permission.ADJUST_STOCK)
  updateMachine(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateMachineDto,
  ) {
    return this.machineService.updateMachine(req.user.tenantId, id, data);
  }

  @Patch(':id/status')
  @Permissions(Permission.ADJUST_STOCK)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: MachineStatus,
  ) {
    return this.machineService.updateMachineStatus(
      req.user.tenantId,
      id,
      status,
    );
  }

  @Delete(':id')
  @Permissions(Permission.ADJUST_STOCK)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.machineService.deleteMachine(req.user.tenantId, id);
  }
}
