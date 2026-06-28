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
import { HealthcareService } from './healthcare.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { ModuleGuard } from '../common/guards/module.guard';


import { Module } from '../common/decorators/module.decorator';
import {
  CreatePatientDto,
  CreateMedicalRecordDto,
  ScheduleAppointmentDto,
  AddPharmacyBatchDto,
} from './dto/healthcare.dto';

@UseGuards(JwtAuthGuard,  ModuleGuard)
@Module('healthcare')
@Controller('healthcare')
export class HealthcareController {
  constructor(private readonly healthcareService: HealthcareService) {}

  @Post('patients')
  createPatient(@Req() req: any, @Body() data: CreatePatientDto) {
    return this.healthcareService.registerPatient(req.user.tenantId, data);
  }

  @Get('patients')
  getPatients(@Req() req: any) {
    return this.healthcareService.getPatients(req.user.tenantId);
  }

  @Get('patients/:id/history')
  getHistory(@Req() req: any, @Param('id') id: string) {
    return this.healthcareService.getPatientHistory(req.user.tenantId, id);
  }

  @Post('medical-records')
  createRecord(@Req() req: any, @Body() data: CreateMedicalRecordDto) {
    return this.healthcareService.createMedicalRecord(req.user.tenantId, data);
  }

  @Post('appointments')
  schedule(@Req() req: any, @Body() data: ScheduleAppointmentDto) {
    return this.healthcareService.scheduleAppointment(req.user.tenantId, data);
  }

  @Patch('appointments/:id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.healthcareService.updateAppointmentStatus(
      req.user.tenantId,
      id,
      status,
    );
  }

  @Get('pharmacy/expiry-alerts')
  getAlerts(@Req() req: any) {
    return this.healthcareService.getExpiryAlerts(req.user.tenantId);
  }

  @Post('pharmacy/batches')
  addBatch(@Req() req: any, @Body() data: AddPharmacyBatchDto) {
    return this.healthcareService.addPharmacyBatch(req.user.tenantId, data);
  }
}
