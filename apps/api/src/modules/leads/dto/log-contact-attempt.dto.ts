import {IsEnum, IsOptional, IsString, MaxLength} from "class-validator";

export const ContactAttemptType = {
    CALL: "CALL",
    MESSAGE: "MESSAGE",
    MEETING: "MEETING",
} as const;

export type ContactAttemptType = (typeof ContactAttemptType)[keyof typeof ContactAttemptType];

export class LogContactAttemptDto {
    @IsEnum(ContactAttemptType)
    type!: ContactAttemptType;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;
}
