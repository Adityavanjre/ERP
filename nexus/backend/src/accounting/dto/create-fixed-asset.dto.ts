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

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  usefulLife: number; // in months

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @IsOptional()
  @IsString()
  category?: string;
}
