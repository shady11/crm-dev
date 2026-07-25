import {IsEnum, IsOptional, IsString, MinLength} from "class-validator";
import {ProjectStatus} from "@/generated/prisma/enums";

export class CreateProjectDto {
    @IsString()
    @MinLength(2)
    name!: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()

    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;
}