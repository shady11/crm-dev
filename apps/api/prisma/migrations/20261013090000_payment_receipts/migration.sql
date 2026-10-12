-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiptDocumentId" TEXT,
ADD COLUMN     "receiptNumber" TEXT;

-- CreateTable
CREATE TABLE "ReceiptNumberCounter" (
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptNumberCounter_pkey" PRIMARY KEY ("companyId","year")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptDocumentId_key" ON "Payment"("receiptDocumentId");

-- CreateIndex
CREATE INDEX "Payment_receiptNumber_idx" ON "Payment"("receiptNumber");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptNumberCounter" ADD CONSTRAINT "ReceiptNumberCounter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill (FIN-8): every incoming payment already recorded gets a receipt
-- number, per company and year of recording, in the order recorded. Refunds
-- get none. Then each counter starts after the numbers it handed out here.
WITH numbered AS (
    SELECT p."id",
           d."companyId",
           EXTRACT(YEAR FROM p."createdAt")::int AS "year",
           ROW_NUMBER() OVER (
               PARTITION BY d."companyId", EXTRACT(YEAR FROM p."createdAt")
               ORDER BY p."createdAt", p."paidAt", p."id"
           ) AS "seq"
    FROM "Payment" p
    JOIN "Deal" d ON d."id" = p."dealId"
    WHERE p."paymentType" <> 'REFUND'
      AND p."deletedAt" IS NULL
      AND p."receiptNumber" IS NULL
)
UPDATE "Payment" p
SET "receiptNumber" = 'R-' || n."year" || '-' || LPAD(n."seq"::text, 4, '0')
FROM numbered n
WHERE p."id" = n."id";

INSERT INTO "ReceiptNumberCounter" ("companyId", "year", "lastSequence")
SELECT d."companyId", EXTRACT(YEAR FROM p."createdAt")::int, COUNT(*)
FROM "Payment" p
JOIN "Deal" d ON d."id" = p."dealId"
WHERE p."receiptNumber" IS NOT NULL
GROUP BY d."companyId", EXTRACT(YEAR FROM p."createdAt");
