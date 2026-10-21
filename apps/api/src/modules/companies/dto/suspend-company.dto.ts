import {IsOptional, IsString, MaxLength} from "class-validator";

/** SA-12: why the company was suspended, kept in the audit log. */
export class SuspendCompanyDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
