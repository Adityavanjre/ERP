import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';

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
  location?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;
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
  items: CreateBOMItemDto[];
}
