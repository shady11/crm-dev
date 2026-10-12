import { Injectable } from '@nestjs/common';

import { DbClient } from '@/database/prisma.types';

/**
 * FIN-8: receipt numbers, R-YYYY-NNNN, gap-free per company and year. Same
 * mechanism as DealNumberService: the counter row is created if missing,
 * then incremented with UPDATE ... RETURNING, which takes a row lock, so
 * concurrent payments queue for their number instead of sharing one. Call
 * it inside the transaction that records the payment, so a rolled-back
 * payment gives its number back.
 */
@Injectable()
export class ReceiptNumberService {
  async next(db: DbClient, companyId: string): Promise<string> {
    const year = new Date().getFullYear();

    await db.$executeRaw`
            INSERT INTO "ReceiptNumberCounter" ("companyId", "year", "lastSequence")
            VALUES (${companyId}, ${year}, 0)
            ON CONFLICT ("companyId", "year") DO NOTHING
        `;

    const result = await db.$queryRaw<{ lastSequence: number }[]>`
            UPDATE "ReceiptNumberCounter"
            SET "lastSequence" = "lastSequence" + 1
            WHERE "companyId" = ${companyId} AND "year" = ${year}
            RETURNING "lastSequence"
        `;

    return formatReceiptNumber(year, result[0].lastSequence);
  }
}

export function formatReceiptNumber(year: number, sequence: number): string {
  return `R-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Numbers every incoming payment that has no receipt number yet, per company
 * and year of recording, in the order recorded, and moves each counter past
 * them. The same rule the payment_receipts migration applied to existing
 * data; the demo seed uses it for the payments it writes directly.
 */
export async function numberUnnumberedPayments(
  db: Pick<DbClient, '$executeRaw'>,
): Promise<void> {
  await db.$executeRaw`
        WITH numbered AS (
            SELECT p."id",
                   d."companyId",
                   EXTRACT(YEAR FROM p."createdAt")::int AS "year",
                   COALESCE(c."lastSequence", 0) + ROW_NUMBER() OVER (
                       PARTITION BY d."companyId", EXTRACT(YEAR FROM p."createdAt")
                       ORDER BY p."createdAt", p."paidAt", p."id"
                   ) AS "seq"
            FROM "Payment" p
            JOIN "Deal" d ON d."id" = p."dealId"
            LEFT JOIN "ReceiptNumberCounter" c
                   ON c."companyId" = d."companyId" AND c."year" = EXTRACT(YEAR FROM p."createdAt")::int
            WHERE p."paymentType" <> 'REFUND'
              AND p."deletedAt" IS NULL
              AND p."receiptNumber" IS NULL
        )
        UPDATE "Payment" p
        SET "receiptNumber" = 'R-' || n."year" || '-' || LPAD(n."seq"::text, 4, '0')
        FROM numbered n
        WHERE p."id" = n."id"
    `;

  await db.$executeRaw`
        INSERT INTO "ReceiptNumberCounter" ("companyId", "year", "lastSequence")
        SELECT d."companyId",
               EXTRACT(YEAR FROM p."createdAt")::int,
               MAX(CAST(SUBSTRING(p."receiptNumber" FROM 'R-[0-9]{4}-([0-9]+)') AS INTEGER))
        FROM "Payment" p
        JOIN "Deal" d ON d."id" = p."dealId"
        WHERE p."receiptNumber" IS NOT NULL
        GROUP BY d."companyId", EXTRACT(YEAR FROM p."createdAt")
        ON CONFLICT ("companyId", "year")
        DO UPDATE SET "lastSequence" = GREATEST("ReceiptNumberCounter"."lastSequence", EXCLUDED."lastSequence")
    `;
}
