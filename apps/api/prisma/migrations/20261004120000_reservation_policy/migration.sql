-- Per-company reservation policy (see Company.reservationDefaultDays and
-- friends) and a per-deal count of reservation extensions.

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "reservationDefaultDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "reservationMaxDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "reservationMaxExtensions" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "reservationExtensionCount" INTEGER NOT NULL DEFAULT 0;

-- Reservations booked without an expiry date never expired. Give each one
-- still open the company's default term counted from now — not from when it
-- was booked, which would expire most of them on the cron's next run with no
-- warning to the managers holding them.
UPDATE "Deal" d
SET "reservationExpiresAt" = now() + make_interval(days => c."reservationDefaultDays")
FROM "Company" c
WHERE c.id = d."companyId"
  AND d.status = 'RESERVED'
  AND d."reservationExpiresAt" IS NULL
  AND d."deletedAt" IS NULL;
