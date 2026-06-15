import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { UnitStatus, UnitType } from "@/generated/prisma/enums";

export class QueryChessboardDto {
    @IsOptional()
    @IsUUID()
    blockId?: string;

    @IsOptional()
    @IsUUID()
    entranceId?: string;

    @IsOptional()
    @IsEnum(UnitType)
    type?: UnitType;

    @IsOptional()
    @IsEnum(UnitStatus)
    status?: UnitStatus;
}