import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsArray,
} from 'class-validator';

export class DefineModelDto {
  @IsString()
  @IsNotEmpty()
  appName: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsArray()
  @IsNotEmpty()
  fields: any[];
}

export class GenericRecordDto {
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}

export class WorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  modelName: string;

  @IsObject()
  @IsOptional()
  config?: any;
}

export class WorkflowNodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsOptional()
  config?: any;
}
