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

  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @IsOptional()
  @IsString()
  gstType?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  name?: string;
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
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  otherReferences?: string;

  @IsOptional()
  @IsString()
  lrRrNumber?: string;

  @IsOptional()
  @IsString()
  salesPerson?: string;

  @IsOptional()
  @IsString()
  warehouse?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

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

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsNumber()
  billingTimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  freight?: number;

  @IsOptional()
  @IsNumber()
  packingCharges?: number;

  @IsOptional()
  @IsNumber()
  loadingCharges?: number;

  @IsOptional()
  @IsNumber()
  insurance?: number;

  @IsOptional()
  @IsNumber()
  otherCharges?: number;

  @IsOptional()
  @IsNumber()
  roundOff?: number;

  @IsOptional()
  @IsNumber()
  cessAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  declaration?: string;
}
