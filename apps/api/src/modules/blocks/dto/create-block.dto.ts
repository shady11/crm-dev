import {
    IsInt,
    IsOptional,
    IsString,
    Min,
    MinLength,
} from "class-validator";

export class CreateBlockDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}