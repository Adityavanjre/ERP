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

class InvoiceItemDto {
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
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  billingPrefix?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  termsOfPayment?: string;

  @IsOptional()
  @IsString()
  termsOfDelivery?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  buyersOrderNo?: string;

  @IsOptional()
  @IsString()
  eWayBillNo?: string;

  @IsOptional()
  billingAddress?: string;

  @IsOptional()
  shippingAddress?: string;

  @IsOptional()
  supplierAddress?: string;

  @IsOptional()
  billingMode?: string;

  @IsOptional()
  itemSections?: any;

  @IsOptional()
  projectId?: string;
}
