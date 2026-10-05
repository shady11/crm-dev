-- Undo support: soft-deleted tasks and documents can be restored, and the
-- restore is logged alongside the delete it reverses.

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'RESTORED_TASK';
ALTER TYPE "ActivityAction" ADD VALUE 'RESTORED_DOCUMENT';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'TASK_RESTORED';
ALTER TYPE "ActivityType" ADD VALUE 'DOCUMENT_RESTORED';
