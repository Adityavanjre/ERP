import {
  IsString,
  IsNotEmpty,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class TransactionEntryDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CreateJournalEntryDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  date: string;

  @ValidateNested({ each: true })
  @Type(() => TransactionEntryDto)
  @ArrayMinSize(2)
  transactions: TransactionEntryDto[];

  @IsString()
  @IsNotEmpty()
  reference: string;
}
