import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ModuleGuard } from '../common/guards/module.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Module } from '../common/decorators/module.decorator';
import {
  RegisterVehicleDto,
  LogFuelDto,
  CreateRouteDto,
  UpdateRouteStatusDto,
  CompleteMaintenanceDto,
  ScheduleMaintenanceDto,
} from './dto/logistics.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@Module('logistics')
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('vehicles')
  @Roles(Role.Owner, Role.Manager)
  register(@Req() req: any, @Body() data: RegisterVehicleDto) {
    return this.logisticsService.registerVehicle(req.user.tenantId, data);
  }

  @Get('vehicles')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  getVehicles(@Req() req: any) {
    return this.logisticsService.getVehicles(req.user.tenantId);
  }

  @Post('fuel-logs')
  @Roles(Role.Owner, Role.Manager, Role.Accountant)
  logFuel(@Req() req: any, @Body() data: LogFuelDto) {
    return this.logisticsService.logFuel(req.user.tenantId, data);
  }

  @Post('routes')
  @Roles(Role.Owner, Role.Manager)
  createRoute(@Req() req: any, @Body() data: CreateRouteDto) {
    return this.logisticsService.createRouteLog(req.user.tenantId, data);
  }

  @Patch('routes/:id/status')
  @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
  updateRouteStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateRouteStatusDto,
  ) {
    return this.logisticsService.updateRouteLogStatus(
      req.user.tenantId,
      id,
      data.status,
      data.arrivalDate,
    );
  }

  @Patch('maintenance/:id/complete')
  @Roles(Role.Owner, Role.Manager)
  completeMaintenance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: CompleteMaintenanceDto,
  ) {
    return this.logisticsService.completeMaintenance(
      req.user.tenantId,
      id,
      data,
    );
  }

  @Post('maintenance')
  @Roles(Role.Owner, Role.Manager)
  schedule(@Req() req: any, @Body() data: ScheduleMaintenanceDto) {
    return this.logisticsService.scheduleMaintenance(req.user.tenantId, data);
  }
}
