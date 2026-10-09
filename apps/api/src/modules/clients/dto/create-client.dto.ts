import {IsEmail, IsOptional, IsString, MinLength} from "class-validator";
import {NormalizePhone} from "@/common/utils/phone.util";

export class CreateClientDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    @NormalizePhone()
    @IsString()
    @MinLength(5)
    phone!: string;

    @IsOptional()
    @NormalizePhone()
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