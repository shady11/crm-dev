import {IsEmail, IsOptional, IsString, IsStrongPassword, IsUUID, MinLength} from "class-validator";
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

    // A Role id from GET /rbac/roles (a system role, or one of the actor's
    // own company's custom roles) — validated against that visible set in
    // UsersService, not here.
    @IsUUID()
    roleId!: string;

    // Required when the chosen Role is branch-scoped (Role.isBranchScoped);
    // must be absent otherwise — enforced in UsersService, not here, since
    // the rule depends on which role was picked.
    @IsOptional()
    @IsUUID()
    branchId?: string;
}
