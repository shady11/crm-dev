-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'CREATED_BRANCH';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATED_BRANCH';
ALTER TYPE "ActivityAction" ADD VALUE 'DEACTIVATED_BRANCH';
ALTER TYPE "ActivityAction" ADD VALUE 'REACTIVATED_BRANCH';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_DEACTIVATED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_REACTIVATED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "targetBranchId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_targetBranchId_idx" ON "Activity"("targetBranchId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_targetBranchId_fkey" FOREIGN KEY ("targetBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
