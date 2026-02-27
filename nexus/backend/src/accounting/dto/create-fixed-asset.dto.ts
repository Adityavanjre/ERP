import {
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    Max,
    IsEnum,
} from 'class-validator';

export enum DepreciationMethod {
    StraightLine = 'StraightLine',
    WDV = 'WDV',
}

export class CreateFixedAssetDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    assetCode: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0.01)
    purchaseValue: number;

    @IsNotEmpty()
    @IsDateString()
    purchaseDate: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    depreciationRate?: number;

    @IsOptional()
    @IsEnum(DepreciationMethod)
    depreciationMethod?: DepreciationMethod;

    @IsOptional()
    @IsString()
    category?: string;
}
