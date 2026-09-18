-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'UPLOADED_DOCUMENT';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETED_DOCUMENT';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATED_DOCUMENT_TEMPLATE';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'DOCUMENT_UPLOADED';
ALTER TYPE "ActivityType" ADD VALUE 'DOCUMENT_DELETED';
ALTER TYPE "ActivityType" ADD VALUE 'DOCUMENT_TEMPLATE_UPDATED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "documentId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_documentId_idx" ON "Activity"("documentId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
