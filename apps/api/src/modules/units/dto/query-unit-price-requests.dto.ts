import {IsEnum, IsInt, IsOptional, IsUUID, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {UnitPriceRequestStatus} from "@/generated/prisma/enums";

export class QueryUnitPriceRequestsDto {
    // Left out: every request but cancelled ones, pending first.
    @IsOptional()
    @IsEnum(UnitPriceRequestStatus)
    status?: UnitPriceRequestStatus;

    @IsOptional()
    @IsUUID()
    unitId?: string;

    @IsOptional()
    @Transform(({value}: {value: unknown}) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({value}: {value: unknown}) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
