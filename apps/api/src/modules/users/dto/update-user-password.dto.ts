import {IsStrongPassword} from "class-validator";
import {STRONG_PASSWORD_OPTIONS} from "@/common/constants/password-policy.constants";

export class UpdateUserPasswordDto {
    @IsStrongPassword(STRONG_PASSWORD_OPTIONS, {
        message:
            "Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number.",
    })
    password!: string;
}
