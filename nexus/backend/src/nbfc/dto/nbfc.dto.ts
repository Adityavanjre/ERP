import {
    IsString,
    IsNumber,
    IsOptional,
    IsPositive,
    IsEnum,
    IsDateString,
    MaxLength,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LoanPurpose {
    BUSINESS = 'BUSINESS',
    PERSONAL = 'PERSONAL',
    VEHICLE = 'VEHICLE',
    HOME = 'HOME',
    EDUCATION = 'EDUCATION',
    OTHER = 'OTHER',
}

export class LoanApplicationDto {
    @IsString()
    @MaxLength(100)
    customerId: string;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    amount: number;

    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(360)
    @Type(() => Number)
    tenureMonths: number;

    @IsNumber()
    @IsPositive()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    interestRate: number;

    @IsOptional()
    @IsEnum(LoanPurpose)
    purpose?: LoanPurpose;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

export class LoanDisbursementDto {
    @IsString()
    @MaxLength(100)
    bankAccountId: string;

    @IsString()
    @MaxLength(100)
    loanAssetAccountId: string;

    @IsOptional()
    @IsDateString()
    disbursementDate?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    bankAccountNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    notes?: string;
}

export class KycSubmitDto {
    @IsOptional()
    @IsString()
    @MaxLength(20)
    panNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    aadhaarNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    documentUrl?: string;
}
