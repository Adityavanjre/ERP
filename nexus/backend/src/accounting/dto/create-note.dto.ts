import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class NoteItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.000001, { message: 'Quantity must be greater than zero' })
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class CreateCreditNoteDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteItemDto)
  items: NoteItemDto[];
}

export class CreateDebitNoteDto {
  @IsNotEmpty()
  @IsString()
  supplierId: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteItemDto)
  items: NoteItemDto[];
}
