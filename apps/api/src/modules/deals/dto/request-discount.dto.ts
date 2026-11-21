import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * E2E-21: a new discount on a reservation, after a rejection or a change in
 * the talks with the client, without cancelling and booking again. 0 takes
 * the discount off.
 */
export class RequestDiscountDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
