import {IsBoolean, IsOptional, IsString, MaxLength, MinLength} from "class-validator";

// `type` and `code` are immutable after creation — changing either would
// silently invalidate whatever companies already reference this option by
// (type, code). Only the display label and whether it's offered can change.
export class UpdateSettingOptionDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    label?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
