import {IsOptional, IsString} from "class-validator";

export class DeactivateUserDto {
    // Picked from the "reassign to" step. Omitted entirely, deactivation still
    // proceeds — but then it's a deliberate choice by the caller, not a silent
    // default (CA-B1).
    @IsOptional()
    @IsString()
    reassignToId?: string;
}
