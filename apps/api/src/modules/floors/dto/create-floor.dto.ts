import {
    IsInt,
    IsOptional,
    Min,
} from "class-validator";

export class CreateFloorDto {
    @IsInt()
    @Min(-10)
    number!: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}