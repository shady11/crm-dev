import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * E2E-21: the approver may grant less than was asked ("12%, not 20%").
 * Left out, the requested discount is approved as it is.
 */
export class ApproveDiscountDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  discountPercent?: number;
}
