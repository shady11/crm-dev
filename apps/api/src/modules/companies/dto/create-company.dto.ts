import {Transform} from "class-transformer";
import {IsEmail, IsOptional, IsString, MaxLength, MinLength} from "class-validator";

export class CreateCompanyDto {
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    // Defaulted in the service rather than here, so a tenant created without
    // these never ends up with a null currency — which the UI renders as a
    // dollar sign regardless of where the company actually is.
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

    // The tenant's first administrator. A company with no way in is useless, so
    // this is created in the same transaction rather than as a second step.
    @IsString()
    @MinLength(2)
    adminFullName!: string;

    @IsEmail()
    adminEmail!: string;

    // SA-1: blank means "generate one", the same as leaving it out; a form
    // sends the empty field rather than omitting it.
    @Transform(({value}: {value: unknown}) => (typeof value === "string" && value.trim() === "" ? undefined : value))
    @IsOptional()
    @IsString()
    @MinLength(8)
    adminPassword?: string;
}
