-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'BRANCH_TRANSFERRED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'LEAD_BRANCH_TRANSFERRED';
ALTER TYPE "ActivityType" ADD VALUE 'CLIENT_BRANCH_TRANSFERRED';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_companyId_idx" ON "Branch"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_companyId_name_key" ON "Branch"("companyId", "name");

-- CreateIndex
CREATE INDEX "Client_companyId_branchId_idx" ON "Client"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "Deal_companyId_branchId_idx" ON "Deal"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "Deal_companyId_branchId_status_idx" ON "Deal"("companyId", "branchId", "status");

-- CreateIndex
CREATE INDEX "Lead_companyId_branchId_idx" ON "Lead"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "Lead_companyId_branchId_status_idx" ON "Lead"("companyId", "branchId", "status");

-- CreateIndex
CREATE INDEX "Task_companyId_branchId_idx" ON "Task"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "User_companyId_branchId_idx" ON "User"("companyId", "branchId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
