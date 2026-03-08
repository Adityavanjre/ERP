import {
  IsString,
  IsNotEmpty,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class TransactionEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000) // ACC-005: 1 Billion max per entry
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;
}

export class CreateJournalEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsDateString()
  date: string;

  @ValidateNested({ each: true })
  @Type(() => TransactionEntryDto)
  @ArrayMinSize(2)
  transactions: TransactionEntryDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reference: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  correlationId?: string;
}
