import {IsOptional, IsString, MaxLength, MinLength} from "class-validator";

export class UpdateCompanyDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

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
