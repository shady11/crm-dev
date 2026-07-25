import {IsEmail, IsOptional, IsString, MinLength} from "class-validator";

export class CreateClientDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    @IsString()
    @MinLength(5)
    phone!: string;

    @IsOptional()
    @IsString()
    whatsapp?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    passport?: string;

    @IsOptional()
    @IsString()
    @MinLength(14)
    pin?: string;
}