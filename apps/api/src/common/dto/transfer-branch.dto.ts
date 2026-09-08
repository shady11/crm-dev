import {IsUUID} from "class-validator";

// Shared by the leads and clients branch-handoff endpoints (BR-D1).
export class TransferBranchDto {
    @IsUUID()
    branchId!: string;
}
