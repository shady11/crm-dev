-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'CREATED_BLOCK';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATED_BLOCK';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETED_BLOCK';
ALTER TYPE "ActivityAction" ADD VALUE 'CREATED_ENTRANCE';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATED_ENTRANCE';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETED_ENTRANCE';
ALTER TYPE "ActivityAction" ADD VALUE 'CREATED_FLOOR';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATED_FLOOR';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETED_FLOOR';
ALTER TYPE "ActivityAction" ADD VALUE 'IMPORTED_FLOORS';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'BLOCK_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'BLOCK_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'BLOCK_DELETED';
ALTER TYPE "ActivityType" ADD VALUE 'ENTRANCE_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'ENTRANCE_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'ENTRANCE_DELETED';
ALTER TYPE "ActivityType" ADD VALUE 'FLOOR_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'FLOOR_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'FLOOR_DELETED';
ALTER TYPE "ActivityType" ADD VALUE 'FLOORS_IMPORTED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "blockId" TEXT,
ADD COLUMN     "entranceId" TEXT,
ADD COLUMN     "floorId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_blockId_idx" ON "Activity"("blockId");

-- CreateIndex
CREATE INDEX "Activity_entranceId_idx" ON "Activity"("entranceId");

-- CreateIndex
CREATE INDEX "Activity_floorId_idx" ON "Activity"("floorId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_entranceId_fkey" FOREIGN KEY ("entranceId") REFERENCES "Entrance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
