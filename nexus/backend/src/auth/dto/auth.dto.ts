import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  tenantName: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  companyType?: string;
}

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000) // ID Tokens are long
  idToken: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase())
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  newPassword: string;
}

export class OnboardingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  industry: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  businessType: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  gstin?: string;
}

export class MfaVerifyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  token: string; // Temporary token from login

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  totpCode: string;
}

export class MfaSetupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  totpCode: string;
}
