import { IsNumber, Max, Min, ValidateIf } from 'class-validator';

/**
 * E2E-24: a company's own discount limit for a role, in percent. null goes
 * back to the built-in role's default.
 */
export class SetDiscountLimitDto {
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountLimit!: number | null;
}
