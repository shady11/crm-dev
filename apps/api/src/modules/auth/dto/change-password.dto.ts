import {IsString, MinLength} from "class-validator";

export class ChangePasswordDto {
    @IsString()
    currentPassword!: string;

    // Eight rather than the six used elsewhere: this is a password being set,
    // not one being checked, so raising the floor here locks nobody out.
    @IsString()
    @MinLength(8)
    newPassword!: string;
}
