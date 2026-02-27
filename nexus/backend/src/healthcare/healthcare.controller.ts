import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { HealthcareService } from './healthcare.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ModuleGuard } from '../common/guards/module.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Module } from '../common/decorators/module.decorator';
import {
    CreatePatientDto,
    CreateMedicalRecordDto,
    ScheduleAppointmentDto,
    AddPharmacyBatchDto,
} from './dto/healthcare.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@Module('healthcare')
@Controller('healthcare')
export class HealthcareController {
    constructor(private readonly healthcareService: HealthcareService) { }

    @Post('patients')
    @Roles(Role.Owner, Role.Manager, Role.Biller)
    createPatient(@Req() req: any, @Body() data: CreatePatientDto) {
        return this.healthcareService.registerPatient(req.user.tenantId, data);
    }

    @Get('patients')
    @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Accountant)
    getPatients(@Req() req: any) {
        return this.healthcareService.getPatients(req.user.tenantId);
    }

    @Get('patients/:id/history')
    @Roles(Role.Owner, Role.Manager, Role.Biller)
    getHistory(@Req() req: any, @Param('id') id: string) {
        return this.healthcareService.getPatientHistory(req.user.tenantId, id);
    }

    @Post('medical-records')
    @Roles(Role.Owner, Role.Manager)
    createRecord(@Req() req: any, @Body() data: CreateMedicalRecordDto) {
        return this.healthcareService.createMedicalRecord(req.user.tenantId, data);
    }

    @Post('appointments')
    @Roles(Role.Owner, Role.Manager, Role.Biller)
    schedule(@Req() req: any, @Body() data: ScheduleAppointmentDto) {
        return this.healthcareService.scheduleAppointment(req.user.tenantId, data);
    }

    @Patch('appointments/:id/status')
    @Roles(Role.Owner, Role.Manager, Role.Biller)
    updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
        return this.healthcareService.updateAppointmentStatus(req.user.tenantId, id, status);
    }

    @Get('pharmacy/expiry-alerts')
    @Roles(Role.Owner, Role.Manager, Role.Biller)
    getAlerts(@Req() req: any) {
        return this.healthcareService.getExpiryAlerts(req.user.tenantId);
    }

    @Post('pharmacy/batches')
    @Roles(Role.Owner, Role.Manager)
    addBatch(@Req() req: any, @Body() data: AddPharmacyBatchDto) {
        return this.healthcareService.addPharmacyBatch(req.user.tenantId, data);
    }
}
