import {IsNumber, IsOptional, IsUUID, Max, Min} from 'class-validator';
import {Type} from 'class-transformer';

/** E2E-7: who would decide a discount of `percent` on a reservation for `clientId`. */
export class DiscountApproversQueryDto {
    @Type(() => Number)
    @IsNumber({maxDecimalPlaces: 2})
    @Min(0)
    @Max(100)
    percent: number;

    @IsOptional()
    @IsUUID()
    clientId?: string;
}
