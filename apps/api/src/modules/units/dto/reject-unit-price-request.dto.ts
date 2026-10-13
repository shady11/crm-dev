import {IsNotEmpty, IsString, MaxLength} from "class-validator";

export class RejectUnitPriceRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason!: string;
}
