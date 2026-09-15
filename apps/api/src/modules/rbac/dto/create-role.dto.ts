import {ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength} from "class-validator";

export class CreateRoleDto {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    // Permission keys from the catalog (GET /rbac/permissions). Unknown keys
    // are rejected by RbacService, not here — the catalog is data, not a
    // fixed enum, so this stays a plain string array.
    @IsArray()
    @ArrayUnique()
    @IsString({each: true})
    permissionKeys!: string[];
}
