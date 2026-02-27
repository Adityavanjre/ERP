import {
    IsString,
    IsOptional,
    IsNumber,
    IsPositive,
    MaxLength,
    IsArray,
    ValidateNested,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BomItemDto {
    @IsString()
    @MaxLength(100)
    description: string;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    quantity: number;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    unit?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    estimatedRate?: number;
}

export class CreateBOQDto {
    @IsString()
    @MaxLength(100)
    projectId: string;

    @IsString()
    @MaxLength(200)
    name: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BomItemDto)
    items?: BomItemDto[];
}

export class UpdateBOQActualsDto {
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    qty: number;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    rate: number;
}

export class UpdateSiteStockDto {
    @IsString()
    @MaxLength(100)
    projectId: string;

    @IsString()
    @MaxLength(100)
    productId: string;

    @IsNumber()
    @Type(() => Number)
    quantity: number;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    warehouseId?: string;
}

export class GenerateRABillDto {
    @IsString()
    @MaxLength(100)
    projectId: string;

    @IsString()
    @MaxLength(100)
    reference: string;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    certifiedAmount: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    retentionRate?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    advanceRecoveryRate?: number;

    @IsString()
    @MaxLength(100)
    arAccountId: string;

    @IsString()
    @MaxLength(100)
    revenueAccountId: string;

    @IsString()
    @MaxLength(100)
    retentionAccountId: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    advanceRecoveryAccountId?: string;
}
