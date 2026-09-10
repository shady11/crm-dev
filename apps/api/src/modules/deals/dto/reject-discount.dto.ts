import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectDiscountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  reason: string;
}
