import {IsBoolean, IsOptional, IsUUID} from "class-validator";

/** SA-7: deactivating a company's user from the platform. */
export class DeactivateCompanyUserDto {
    /** Who takes over their open leads, active deals and open tasks. */
    @IsOptional()
    @IsUUID()
    reassignToId?: string;

    /** Required when they are the last active user who can manage users. */
    @IsOptional()
    @IsBoolean()
    confirmLastAdmin?: boolean;
}
