import {IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength} from "class-validator";
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
    @MinLength(8)
    password!: string;

    @IsEnum(UserRole)
    role!: UserRole;

    // Required for branch-scoped roles (SALES_HEAD, SALES_MANAGER); must be
    // absent for company-wide roles — enforced in UsersService, not here,
    // since the rule depends on the role field.
    @IsOptional()
    @IsUUID()
    branchId?: string;
}