import {IsDateString, IsEnum, IsOptional, IsString, MaxLength} from "class-validator";

export const ContactAttemptType = {
    CALL: "CALL",
    MESSAGE: "MESSAGE",
    MEETING: "MEETING",
    EMAIL: "EMAIL",
} as const;

export type ContactAttemptType = (typeof ContactAttemptType)[keyof typeof ContactAttemptType];

export class LogContactAttemptDto {
    @IsEnum(ContactAttemptType)
    type!: ContactAttemptType;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;

    // The next step agreed on this contact, so logging a call and booking
    // the callback is one action.
    @IsOptional()
    @IsDateString()
    nextContactAt?: string;
}
