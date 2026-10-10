import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
    MinLength,
    ValidateIf,
} from "class-validator";
import { BlockSalesStatus } from "@/generated/prisma/enums";

export class CreateBlockDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;

    @IsOptional()
    @IsEnum(BlockSalesStatus)
    salesStatus?: BlockSalesStatus;

    // Expected handover, YYYY-MM-DD; null clears it on update.
    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsDateString()
    completionDate?: string | null;
}
