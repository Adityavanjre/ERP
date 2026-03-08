import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BrsStatementLineDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class UploadBrsStatementDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrsStatementLineDto)
  lines: BrsStatementLineDto[];
}
