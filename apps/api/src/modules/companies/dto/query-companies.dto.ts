import {IsIn, IsInt, IsOptional, IsString, Max, Min} from "class-validator";
import {Transform} from "class-transformer";

export class QueryCompaniesDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    // "deleted" lists the deleted companies instead (SA-3: restore).
    @IsIn(["active", "suspended", "deleted"])
    status?: "active" | "suspended" | "deleted";

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
