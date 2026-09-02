import { Injectable } from '@nestjs/common';

import { DbClient } from '@/database/prisma.types';

@Injectable()
export class DealNumberService {
  /**
   * Generates the next unique deal number atomically.
   *
   * How it works (PostgreSQL):
   * 1. Ensures a counter row exists for this company/year.
   *    If not, seeds it from existing deals (for backward compatibility).
   * 2. Runs UPDATE ... RETURNING which acquires a row-level lock.
   *    Concurrent transactions wait in line — no duplicates, no crashes.
   */
  async generateDealNumber(
    db: DbClient,
    companyId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `D-${year}-`;

    // ── Step 1: Ensure counter row exists (idempotent) ──
    // If this company/year has never been used, we seed the counter
    // with the highest existing deal number so we don't reuse old numbers.
    await db.$executeRaw`
      INSERT INTO "DealNumberCounter" ("companyId", "year", "lastSequence")
      SELECT 
        ${companyId},
        ${year},
        COALESCE(
          (
            SELECT MAX(CAST(SUBSTRING("dealNumber" FROM 'D-[0-9]{4}-([0-9]+)') AS INTEGER))
            FROM "Deal"
            WHERE "companyId" = ${companyId}
              AND "dealNumber" LIKE ${prefix + '%'}
          ),
          0
        )
      ON CONFLICT ("companyId", "year") DO NOTHING
    `;

    // ── Step 2: Atomically increment & get the next number ──
    // PostgreSQL acquires a row-level lock here. If another transaction
    // is doing the same UPDATE, this one WAITs until the lock is released,
    // then reads the FRESH committed value. No race condition.
    const result = await db.$queryRaw<{ lastSequence: number }[]>`
      UPDATE "DealNumberCounter"
      SET "lastSequence" = "lastSequence" + 1
      WHERE "companyId" = ${companyId} AND "year" = ${year}
      RETURNING "lastSequence"
    `;

    const sequence = result[0].lastSequence;

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }
}