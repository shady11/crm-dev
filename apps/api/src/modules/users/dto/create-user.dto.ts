import {IsEmail, IsEnum, IsOptional, IsString, MinLength} from "class-validator";
import {UserRole} from "@/generated/prisma/enums";

export class CreateUserDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    @IsEmail()
    email!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsEnum(UserRole)
    role!: UserRole;
}