import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
  Max,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OpportunityStage {
  New = 'New',
  Contacted = 'Contacted',
  Qualified = 'Qualified',
  Proposal = 'Proposal',
  Negotiation = 'Negotiation',
  Won = 'Won',
  Lost = 'Lost',
}

export class CreateOpportunityDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedClose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerId?: string;
}

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedClose?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  gstin?: string;
}

export class AddOpeningBalanceDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
