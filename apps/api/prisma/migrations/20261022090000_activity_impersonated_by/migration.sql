-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "impersonatedById" TEXT;

-- CreateIndex
CREATE INDEX "Activity_impersonatedById_idx" ON "Activity"("impersonatedById");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_impersonatedById_fkey" FOREIGN KEY ("impersonatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
