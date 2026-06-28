import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';


export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  permissions?: any;
}

export class UpdateRoleDto {
  @IsString()
  permissions?: any;
}
