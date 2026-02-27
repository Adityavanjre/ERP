
import { IsString, IsNumber, IsOptional, IsNotEmpty, IsBoolean, Min, Max, IsEnum } from 'class-validator';

export class CreateWarehouseDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsBoolean()
    @IsOptional()
    isRetail?: boolean;
}

export class UpdateWarehouseDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsBoolean()
    @IsOptional()
    isRetail?: boolean;
}

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    basePrice: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    costPrice?: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    gstRate?: number;

    @IsString()
    @IsOptional()
    hsnCode?: string;

    @IsString()
    @IsOptional()
    uom?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    stock?: number;

    @IsString()
    @IsOptional()
    warehouseId?: string;

    @IsBoolean()
    @IsOptional()
    isGstOverride?: boolean;
}

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    basePrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    costPrice?: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    gstRate?: number;

    @IsString()
    @IsOptional()
    hsnCode?: string;

    @IsString()
    @IsOptional()
    uom?: string;
}

export class LogMovementDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    warehouseId: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsEnum(['IN', 'OUT'])
    type: 'IN' | 'OUT';

    @IsString()
    @IsOptional()
    reference?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class TransferStockDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    fromWarehouseId: string;

    @IsString()
    @IsNotEmpty()
    toWarehouseId: string;

    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class PostOpeningBalanceDto {
    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsString()
    @IsNotEmpty()
    warehouseId: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
