-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'GENERATED_DOCUMENT';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'DOCUMENT_GENERATED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "legalName" TEXT,
ADD COLUMN "taxId" TEXT,
ADD COLUMN "signatoryName" TEXT,
ADD COLUMN "signatoryTitle" TEXT,
ADD COLUMN "letterheadUrl" TEXT;

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "generatedFromTemplateId" TEXT;

-- CreateIndex
CREATE INDEX "DocumentTemplate_companyId_idx" ON "DocumentTemplate"("companyId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_companyId_type_idx" ON "DocumentTemplate"("companyId", "type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_companyId_type_isActive_idx" ON "DocumentTemplate"("companyId", "type", "isActive");

-- CreateIndex
CREATE INDEX "Document_generatedFromTemplateId_idx" ON "Document"("generatedFromTemplateId");

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_generatedFromTemplateId_fkey" FOREIGN KEY ("generatedFromTemplateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
