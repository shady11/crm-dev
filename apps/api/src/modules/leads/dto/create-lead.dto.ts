import {IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateIf} from "class-validator";
import {Type} from "class-transformer";
import {FinancingType, LeadStatus} from "@/generated/prisma/enums";
import {NormalizePhone} from "@/common/utils/phone.util";

export class CreateLeadDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    @NormalizePhone()
    @IsString()
    @MinLength(5)
    phone!: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsUUID()
    managerId?: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;

    // When to get back to this lead. null clears it on update.
    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsDateString()
    nextContactAt?: string | null;

    // Set once the caller has seen the duplicate warning (from
    // GET /leads/duplicates) and wants to create the lead anyway — a repeat
    // walk-in enquiry from the same number is a legitimate lead, not always
    // a mistake. Without this flag, create() rejects a phone number that
    // already matches an existing lead or client.
    @IsOptional()
    @IsBoolean()
    confirmDuplicate?: boolean;

    // Qualification. null clears a value on update.
    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsNumber({maxDecimalPlaces: 2})
    @Min(0)
    budget?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(10)
    rooms?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsUUID()
    preferredProjectId?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsEnum(FinancingType)
    financingType?: FinancingType | null;
}
