import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateProjectDto {
    @IsString()
    @MinLength(2)
    name!: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    status?: string;
}