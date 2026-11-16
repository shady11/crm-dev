-- E2E-9: tasks the system makes carry a template key, so their title shows
-- in the reader's language.
ALTER TABLE "Task" ADD COLUMN "templateKey" TEXT;
ALTER TABLE "Task" ADD COLUMN "templateParams" JSONB;

-- The automatic tasks already made, recognised by the English the app
-- wrote for them, on the record they were made for.
UPDATE "Task"
SET "templateKey" = 'firstContactCall',
    "templateParams" = jsonb_build_object('name', substr(title, 6))
WHERE "leadId" IS NOT NULL
  AND type = 'CALL'
  AND title LIKE 'Call %';

UPDATE "Task"
SET "templateKey" = 'confirmDealDocuments',
    "templateParams" = jsonb_build_object('dealNumber', substr(title, length('Confirm documents for deal ') + 1))
WHERE "dealId" IS NOT NULL
  AND type = 'FOLLOW_UP'
  AND title LIKE 'Confirm documents for deal %';

-- They were never closed: close the open ones whose step is already done.
UPDATE "Task" t
SET status = 'DONE', "updatedAt" = now()
FROM "Lead" l
WHERE t."templateKey" = 'firstContactCall' AND t."leadId" = l.id
  AND l."clientId" IS NOT NULL
  AND t.status IN ('TODO', 'IN_PROGRESS') AND t."deletedAt" IS NULL;

UPDATE "Task" t
SET status = 'DONE', "updatedAt" = now()
FROM "Deal" d
WHERE t."templateKey" = 'confirmDealDocuments' AND t."dealId" = d.id
  AND d.status IN ('CONTRACT_SIGNED', 'ACTIVE', 'COMPLETED')
  AND t.status IN ('TODO', 'IN_PROGRESS') AND t."deletedAt" IS NULL;
