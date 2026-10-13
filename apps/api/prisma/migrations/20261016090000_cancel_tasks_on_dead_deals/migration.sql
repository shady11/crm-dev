-- SH-3: from now on, cancelling a deal or letting its reservation lapse
-- cancels the deal's open tasks. Tidy up the ones already left behind, so
-- they stop counting as overdue on the team's dashboards.
UPDATE "Task" t
SET "status" = 'CANCELLED', "updatedAt" = NOW()
FROM "Deal" d
WHERE t."dealId" = d."id"
  AND d."status" IN ('CANCELLED', 'EXPIRED')
  AND t."status" IN ('TODO', 'IN_PROGRESS')
  AND t."deletedAt" IS NULL;
