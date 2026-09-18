-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'CREATED_PROJECT';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATED_PROJECT';
ALTER TYPE "ActivityAction" ADD VALUE 'CHANGED_PROJECT_STATUS';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETED_PROJECT';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_STATUS_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_DELETED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_projectId_idx" ON "Activity"("projectId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
