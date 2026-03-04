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
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { MachineStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateMachineDto } from './dto/manufacturing.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('manufacturing/machines')
export class MachineController {
  constructor(private readonly machineService: MachineService) { }

  @Post()
  @Roles(Role.Owner, Role.Manager)
  create(@Req() req: any, @Body() data: CreateMachineDto) {
    return this.machineService.createMachine(req.user.tenantId, data);
  }

  @Get()
  @Roles(Role.Owner)
  findAll(@Req() req: any) {
    return this.machineService.getMachines(req.user.tenantId);
  }

  @Patch(':id/status')
  @Roles(Role.Owner, Role.Manager)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: MachineStatus,
  ) {
    return this.machineService.updateMachineStatus(req.user.tenantId, id, status);
  }

  @Delete(':id')
  @Roles(Role.Owner)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.machineService.deleteMachine(req.user.tenantId, id);
  }
}
