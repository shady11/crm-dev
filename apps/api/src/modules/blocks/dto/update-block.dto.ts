import { PartialType } from "@nestjs/mapped-types";
import { IsOptional, IsUUID, ValidateIf } from "class-validator";
import { CreateBlockDto } from "./create-block.dto";

export class UpdateBlockDto extends PartialType(CreateBlockDto) {
    // The construction phase the block belongs to; null takes it out.
    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsUUID()
    phaseId?: string | null;
}
