import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  stock: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;
}
