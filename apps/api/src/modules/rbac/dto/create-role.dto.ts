import {ArrayUnique, IsArray, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf} from "class-validator";
import {Transform} from "class-transformer";

export class CreateRoleDto {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    // Permission keys from the catalog (GET /rbac/permissions). Unknown keys
    // are rejected by RbacService, not here — the catalog is data, not a
    // fixed enum, so this stays a plain string array.
    @IsArray()
    @ArrayUnique()
    @IsString({each: true})
    permissionKeys!: string[];

    // Own discretionary discount ceiling, in percent. Omitted/null means
    // unlimited — see Role.discountLimit and DealDomainService.
    @IsOptional()
    @Transform(({value}) => (value === null || value === undefined ? value : Number(value)))
    @ValidateIf((_, value) => value !== null)
    @IsNumber({maxDecimalPlaces: 2})
    @Min(0)
    @Max(100)
    discountLimit?: number | null;
}
