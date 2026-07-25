import {IsEnum, IsOptional, IsUUID,} from 'class-validator';
import {DealStatus} from "@/generated/prisma/client";

export class DealQueryDto {
    @IsOptional()
    @IsEnum(DealStatus)
    status?: DealStatus;

    @IsOptional()
    @IsUUID()
    projectId?: string;

    @IsOptional()
    @IsUUID()
    managerId?: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;
}