-- E2E-6: a unit is sold once its contract is signed, not when the last
-- installment comes in. Units under a signed or active deal that the old
-- rule left "reserved" are marked sold now, each with a line in the unit's
-- history credited to whoever signed the contract (or the deal's manager),
-- as the app writes it at signing from now on. One statement, so the
-- history rows come from exactly the units this changes.
WITH moved AS (
  UPDATE "Unit" u
  SET status = 'SOLD', "updatedAt" = now()
  FROM "Deal" d
  WHERE d."unitId" = u.id
    AND d."deletedAt" IS NULL
    AND d.status IN ('CONTRACT_SIGNED', 'ACTIVE')
    AND u.status = 'RESERVED'
  RETURNING u.id AS "unitId", d.id AS "dealId", d."companyId",
    COALESCE(
      (SELECT a."userId" FROM "Activity" a
        WHERE a."dealId" = d.id AND a.type = 'CONTRACT_SIGNED'
        ORDER BY a."createdAt" DESC LIMIT 1),
      d."managerId"
    ) AS "userId"
)
INSERT INTO "Activity" (id, "companyId", "userId", "unitId", action, type, title, "templateKey", metadata, "createdAt")
SELECT gen_random_uuid(), m."companyId", m."userId", m."unitId",
       'CHANGED_UNIT_STATUS', 'UNIT_STATUS_CHANGED', 'Unit marked sold', 'unitMarkedSold',
       jsonb_build_object('toStatus', 'SOLD', 'dealId', m."dealId", 'reason', 'contract_signed'),
       now()
FROM moved m
WHERE m."userId" IS NOT NULL;
