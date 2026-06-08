/*
  Warnings:

  - A unique constraint covering the columns `[blockId,name]` on the table `Entrance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[blockId,number]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Unit_projectId_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "Entrance_blockId_name_key" ON "Entrance"("blockId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_blockId_number_key" ON "Unit"("blockId", "number");
