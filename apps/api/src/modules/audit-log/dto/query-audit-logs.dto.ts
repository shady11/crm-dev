import {IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {AuditAction} from "@/generated/prisma/enums";

export class QueryAuditLogsDto {
    @IsOptional()
    @IsString()
    companyId?: string;

    @IsOptional()
    @IsString()
    actorId?: string;

    @IsOptional()
    @IsEnum(AuditAction)
    action?: AuditAction;

    /** SA-11: leave out sign-ins, which otherwise make up most rows. */
    @IsOptional()
    @Transform(({value}) => value === true || value === "true")
    @IsBoolean()
    hideLogins?: boolean;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    @Transform(({value}) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({value}) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
