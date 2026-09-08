import {IsOptional, IsString, MaxLength, MinLength} from "class-validator";

/**
 * Fields a COMPANY_ADMIN may change on their own tenant. Deliberately
 * narrower than UpdateCompanyDto — phone/address stay reserved for the
 * platform operator's endpoint, matching CA-A1's scope (name, currency,
 * locale, timezone only).
 */
export class UpdateOwnCompanyDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    currency?: string;

    @IsOptional()
    @IsString()
    @MaxLength(35)
    locale?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    timezone?: string;
}
