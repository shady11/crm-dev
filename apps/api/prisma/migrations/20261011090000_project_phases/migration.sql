-- CreateEnum
CREATE TYPE "PhaseSalesStatus" AS ENUM ('UPCOMING', 'ON_SALE', 'COMPLETED');

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "phaseId" TEXT;

-- CreateTable
CREATE TABLE "ProjectPhase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "salesStatus" "PhaseSalesStatus" NOT NULL DEFAULT 'ON_SALE',
    "completionDate" DATE,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPhase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectPhase_projectId_idx" ON "ProjectPhase"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPhase_projectId_name_key" ON "ProjectPhase"("projectId", "name");

-- CreateIndex
CREATE INDEX "Block_phaseId_idx" ON "Block"("phaseId");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhase" ADD CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

