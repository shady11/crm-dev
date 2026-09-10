import {IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength} from "class-validator";
import {Type} from "class-transformer";

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

    // Legal identity for generated contracts/agreements (see
    // DocumentGenerationService) — kept on this DTO rather than
    // UpdateCompanyDto since it's the tenant's own business detail, not
    // something the platform operator manages.
    @IsOptional()
    @IsString()
    @MaxLength(200)
    legalName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    taxId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    signatoryName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    signatoryTitle?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    letterheadUrl?: string;

    // Discount approval thresholds, in percent — see DealDomainService.
    // requiresDiscountApproval/canDecideDiscount. salesHeadDiscountLimit
    // must be >= salesManagerDiscountLimit; CompaniesService.update enforces
    // that across a partial update, since either can be sent alone.
    @IsOptional()
    @Type(() => Number)
    @IsNumber({maxDecimalPlaces: 2})
    @Min(0)
    @Max(100)
    salesManagerDiscountLimit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({maxDecimalPlaces: 2})
    @Min(0)
    @Max(100)
    salesHeadDiscountLimit?: number;
}
