import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;

    // Required only when the account has TOTP enabled — AuthService checks
    // that after the password, so a stolen password alone is not enough.
    @IsOptional()
    @IsString()
    totpCode?: string;
}