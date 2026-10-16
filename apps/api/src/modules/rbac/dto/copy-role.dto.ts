import {IsOptional, IsString, MaxLength, MinLength} from "class-validator";

/** CA-2: the copy's name; "<original> (copy)" when left out. */
export class CopyRoleDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name?: string;
}
