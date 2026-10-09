import {IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf} from "class-validator";
import {LeadStatus} from "@/generated/prisma/enums";

export class CreateLeadDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

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
}