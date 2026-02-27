import {
    IsString,
    IsOptional,
    IsDateString,
    MaxLength,
    IsEnum,
    IsNumber,
    IsPositive,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BloodGroup {
    A_POS = 'A+',
    A_NEG = 'A-',
    B_POS = 'B+',
    B_NEG = 'B-',
    O_POS = 'O+',
    O_NEG = 'O-',
    AB_POS = 'AB+',
    AB_NEG = 'AB-',
}

export enum AppointmentStatus {
    SCHEDULED = 'SCHEDULED',
    CHECKED_IN = 'CHECKED_IN',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    NO_SHOW = 'NO_SHOW',
}

export class CreatePatientDto {
    @IsString()
    @MaxLength(100)
    customerId: string;

    @IsOptional()
    @IsEnum(BloodGroup)
    bloodGroup?: BloodGroup;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    medicalHistory?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    allergies?: string;
}

export class CreateMedicalRecordDto {
    @IsString()
    @MaxLength(100)
    patientId: string;

    @IsString()
    @MaxLength(500)
    diagnosis: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    prescription?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @IsOptional()
    @IsDateString()
    visitDate?: string;
}

export class ScheduleAppointmentDto {
    @IsString()
    @MaxLength(100)
    patientId: string;

    @IsDateString()
    scheduledAt: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    doctorName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

export class AddPharmacyBatchDto {
    @IsString()
    @MaxLength(100)
    medicineId: string;

    @IsString()
    @MaxLength(50)
    batchNumber: string;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    quantity: number;

    @IsDateString()
    expiryDate: string;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    unitCost: number;
}
