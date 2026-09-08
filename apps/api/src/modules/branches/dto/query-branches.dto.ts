import {IsBoolean, IsInt, IsOptional, IsString, Max, Min} from "class-validator";
import {Transform} from "class-transformer";

export class QueryBranchesDto {
    @IsOptional()
    @IsString()
    search?: string;

    // Excludes deactivated branches by default — they should not appear as
    // selectable options when assigning a user or filtering a list.
    @IsOptional()
    @Transform(({value}) => value === "true" || value === true)
    @IsBoolean()
    includeDeactivated?: boolean;

    @IsOptional()
    @Transform(({value}) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({value}) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
