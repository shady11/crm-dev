import {IsDateString, IsEnum, IsOptional, IsString, MinLength, ValidateIf} from "class-validator";
import {ProjectStatus} from "@/generated/prisma/enums";

export class CreateProjectDto {
    @IsString()
    @MinLength(2)
    name!: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;

    // E2E-22: planned handover (YYYY-MM-DD), printed on the sale contract;
    // null clears it.
    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsDateString()
    handoverDate?: string | null;
}