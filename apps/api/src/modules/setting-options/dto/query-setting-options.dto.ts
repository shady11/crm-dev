import {IsEnum, IsOptional} from "class-validator";
import {Transform} from "class-transformer";
import {SettingOptionType} from "@/generated/prisma/client";

export class QuerySettingOptionsDto {
    @IsOptional()
    @IsEnum(SettingOptionType)
    type?: SettingOptionType;

    // Inactive options are retired: still valid on whatever company already
    // picked them, but hidden from pickers building a new selection. Only a
    // SUPER_ADMIN managing the list needs to see them, so the controller
    // strips this back off for anyone else.
    @IsOptional()
    @Transform(({value}) => value === "true" || value === true)
    includeInactive?: boolean;
}
