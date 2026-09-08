import {IsOptional, IsString, MaxLength, MinLength} from "class-validator";

export class CreateBranchDto {
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;
}
