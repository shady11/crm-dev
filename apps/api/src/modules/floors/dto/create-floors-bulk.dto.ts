import { IsArray, ValidateNested, IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";

class FloorItem {
    @IsNumber()
    number!: number;

    @IsNumber()
    @IsOptional()
    order?: number;
}

export class CreateFloorsBulkDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FloorItem)
    floors!: FloorItem[];
}