import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMachineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  capacity?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;
}

export class UpdateMachineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;
}

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  bomId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompleteWorkOrderDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  producedQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  scrapQuantity?: number;

  @IsString()
  @IsOptional()
  machineId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  machineTimeHours?: number;

  @IsString()
  @IsOptional()
  operatorName?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class CreateBOMItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class CreateBOMDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBOMItemDto)
  items: CreateBOMItemDto[];
}

export class StartWorkOrderDto {
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  machineId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class UpdateWOStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class ImportBomsDto {
  @IsString()
  @IsNotEmpty()
  csv: string;
}
