-- AlterTable
ALTER TABLE "Document" ADD COLUMN "purgedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Document_deletedAt_purgedAt_idx" ON "Document"("deletedAt", "purgedAt");
