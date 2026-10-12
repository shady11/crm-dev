import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethod, PaymentType } from '@/generated/prisma/client';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Filters for the Payments page and its Excel export. `from` and `to` are
 * calendar days, both inclusive - the same YYYY-MM-DD the browser's date
 * picker sends as a payment date.
 */
export class PaymentRegisterQueryDto {
  @IsOptional()
  @Matches(DAY, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DAY, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  // Company-wide roles only; a branch-scoped user always sees their own.
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Deal number, client name or payment reference. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/** Scope for the receivables export: no period, it's a snapshot of today. */
export class ReceivablesQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
