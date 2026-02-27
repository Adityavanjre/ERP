import {
    IsString,
    IsOptional,
    IsDateString,
    MaxLength,
    IsNumber,
    Min,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, TaskStatus } from '@prisma/client';

export class CreateProjectDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    customerId?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    budget?: number;

    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;
}

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    budget?: number;

    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;
}

export class CreateTaskDto {
    @IsString()
    @MaxLength(200)
    title: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    assigneeId?: string;
}
