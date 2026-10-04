-- At most one open (RESERVED / CONTRACT_SIGNED / ACTIVE, not soft-deleted)
-- deal per unit. This is the database backstop behind the conditional
-- AVAILABLE -> RESERVED claim in DealsService.reserveUnit: two concurrent
-- bookings of the same unit can no longer both succeed.
--
-- If existing data already has a unit with more than one open deal, the index
-- cannot be built. Fail with the offending units named instead of Postgres'
-- generic duplicate-key error, so they can be resolved (cancel all but one
-- deal) before re-running the migration.
DO $$
DECLARE
    duplicates TEXT;
BEGIN
    SELECT string_agg(format('%s (%s open deals)', "unitId", cnt), ', ')
    INTO duplicates
    FROM (
        SELECT "unitId", count(*) AS cnt
        FROM "Deal"
        WHERE status IN ('RESERVED', 'CONTRACT_SIGNED', 'ACTIVE') AND "deletedAt" IS NULL
        GROUP BY "unitId"
        HAVING count(*) > 1
    ) d;

    IF duplicates IS NOT NULL THEN
        RAISE EXCEPTION 'Units with more than one open deal must be resolved before this migration: %', duplicates;
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Deal_unitId_open_key" ON "Deal"("unitId") WHERE (status IN ('RESERVED', 'CONTRACT_SIGNED', 'ACTIVE') AND "deletedAt" IS NULL);
