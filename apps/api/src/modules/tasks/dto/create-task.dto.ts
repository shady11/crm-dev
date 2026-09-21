import {IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength} from "class-validator";
import {TaskPriority, TaskStatus, TaskType} from "@/generated/prisma/client";

export class CreateTaskDto {
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsOptional()
    @IsEnum(TaskType)
    type?: TaskType;

    @IsUUID()
    assignedToId!: string;

    @IsOptional()
    @IsUUID()
    leadId?: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;

    @IsOptional()
    @IsUUID()
    dealId?: string;
}