-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATED_TASK';
ALTER TYPE "ActivityAction" ADD VALUE 'CHANGED_TASK_STATUS';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETED_TASK';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'TASK_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'TASK_STATUS_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'TASK_REASSIGNED';
ALTER TYPE "ActivityType" ADD VALUE 'TASK_DELETED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_taskId_idx" ON "Activity"("taskId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
