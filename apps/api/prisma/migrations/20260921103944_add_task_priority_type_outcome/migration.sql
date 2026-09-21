-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CALL', 'MEETING', 'SITE_VISIT', 'FOLLOW_UP', 'OTHER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ESCALATED';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'OTHER';
