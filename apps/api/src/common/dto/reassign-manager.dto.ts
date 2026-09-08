import {IsUUID} from "class-validator";

// Shared by the leads and deals dedicated reassignment endpoints (SH-A1).
export class ReassignManagerDto {
    @IsUUID()
    managerId!: string;
}
