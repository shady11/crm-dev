import {IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf} from "class-validator";
import {Transform} from "class-transformer";

export class UpdateRoleDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    // Own discretionary discount ceiling, in percent. Omitted = don't
    // change it; null explicitly clears it back to unlimited — see
    // Role.discountLimit and DealDomainService. Not `@Type(() => Number)`:
    // that would coerce an explicit null into 0 (zero discretion), the
    // opposite of what it means here.
    @IsOptional()
    @Transform(({value}) => (value === null || value === undefined ? value : Number(value)))
    @ValidateIf((_, value) => value !== null)
    @IsNumber({maxDecimalPlaces: 2})
    @Min(0)
    @Max(100)
    discountLimit?: number | null;
}
