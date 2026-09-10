import {IsStrongPassword, IsString} from "class-validator";
import {STRONG_PASSWORD_OPTIONS} from "@/common/constants/password-policy.constants";

export class ChangePasswordDto {
    @IsString()
    currentPassword!: string;

    @IsStrongPassword(STRONG_PASSWORD_OPTIONS, {
        message:
            "Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number.",
    })
    newPassword!: string;
}
