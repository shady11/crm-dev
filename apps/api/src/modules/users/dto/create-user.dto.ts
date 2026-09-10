import {IsEmail, IsEnum, IsOptional, IsString, IsStrongPassword, IsUUID, MinLength} from "class-validator";
import {UserRole} from "@/generated/prisma/enums";
import {STRONG_PASSWORD_OPTIONS} from "@/common/constants/password-policy.constants";

export class CreateUserDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    @IsEmail()
    email!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsStrongPassword(STRONG_PASSWORD_OPTIONS, {
        message:
            "Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number.",
    })
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