import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsDateString,
  MaxLength,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VehicleType {
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  BIKE = 'BIKE',
  CAR = 'CAR',
  OTHER = 'OTHER',
}

export enum RouteStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class RegisterVehicleDto {
  @IsString()
  @MaxLength(20)
  registrationNumber: string;

  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  make?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  loadCapacityKg?: number;
}

export class LogFuelDto {
  @IsString()
  @MaxLength(100)
  vehicleId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  litres: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  costPerLitre: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  station?: string;
}

export class CreateRouteDto {
  @IsString()
  @MaxLength(100)
  vehicleId: string;

  @IsString()
  @MaxLength(200)
  origin: string;

  @IsString()
  @MaxLength(200)
  destination: string;

  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateRouteStatusDto {
  @IsEnum(RouteStatus)
  status: RouteStatus;

  @IsOptional()
  @IsDateString()
  arrivalDate?: string;
}

export class CompleteMaintenanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost?: number;

  @IsDateString()
  completionDate: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  currentKM: number;
}

export class ScheduleMaintenanceDto {
  @IsString()
  @MaxLength(100)
  vehicleId: string;

  @IsString()
  @MaxLength(200)
  description: string;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedCost?: number;
}
