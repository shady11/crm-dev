import {IsOptional, IsString, IsUUID} from "class-validator";

export class TransferUserBranchDto {
    @IsUUID()
    branchId!: string;

    // Picked from the "reassign" step, mirrors DeactivateUserDto.reassignToId.
    // Omitted entirely, the transfer still proceeds — the user's open leads
    // and active deals simply keep their old managerId (still that user, now
    // at the new branch) unless reassigned here.
    @IsOptional()
    @IsString()
    reassignToId?: string;
}
