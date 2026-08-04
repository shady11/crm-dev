/*
  Warnings:

  - A unique constraint covering the columns `[companyId,dealNumber]` on the table `Deal` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dealNumber` to the `Deal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "dealNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Deal_companyId_dealNumber_key" ON "Deal"("companyId", "dealNumber");
