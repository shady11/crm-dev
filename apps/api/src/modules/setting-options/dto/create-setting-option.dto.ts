import {IsEnum, IsString, MaxLength, MinLength} from "class-validator";
import {SettingOptionType} from "@/generated/prisma/client";

export class CreateSettingOptionDto {
    @IsEnum(SettingOptionType)
    type!: SettingOptionType;

    // Validated against Intl in the service (a real ISO-4217 code / BCP-47
    // locale tag / IANA timezone name) rather than here, since that check
    // depends on `type`.
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    code!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(200)
    label!: string;
}
