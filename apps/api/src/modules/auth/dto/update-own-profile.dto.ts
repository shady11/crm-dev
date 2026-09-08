import {IsOptional, IsString, MaxLength, MinLength} from "class-validator";

/**
 * Fields a user may change on their own account without an admin. Deliberately
 * excludes role, email, and isActive so this can never become a privilege-
 * escalation path — same reasoning as UpdateOwnCompanyDto's narrower scope.
 */
export class UpdateOwnProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    fullName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;
}
