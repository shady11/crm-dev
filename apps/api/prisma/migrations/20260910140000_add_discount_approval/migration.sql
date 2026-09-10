-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'DISCOUNT_REQUESTED';
ALTER TYPE "ActivityAction" ADD VALUE 'DISCOUNT_APPROVED';
ALTER TYPE "ActivityAction" ADD VALUE 'DISCOUNT_REJECTED';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'DISCOUNT_REQUESTED';
ALTER TYPE "ActivityType" ADD VALUE 'DISCOUNT_APPROVED';
ALTER TYPE "ActivityType" ADD VALUE 'DISCOUNT_REJECTED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DISCOUNT_APPROVAL_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'DISCOUNT_DECIDED';

-- CreateEnum
CREATE TYPE "DiscountApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "salesManagerDiscountLimit" DECIMAL(5,2) NOT NULL DEFAULT 5,
ADD COLUMN "salesHeadDiscountLimit" DECIMAL(5,2) NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "discountApprovalStatus" "DiscountApprovalStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "requestedDiscountPercent" DECIMAL(5,2),
ADD COLUMN "requestedDiscountAmount" DECIMAL(14,2),
ADD COLUMN "discountApprovedById" TEXT,
ADD COLUMN "discountApprovedAt" TIMESTAMP(3),
ADD COLUMN "discountRejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "Deal_companyId_discountApprovalStatus_idx" ON "Deal"("companyId", "discountApprovalStatus");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_discountApprovedById_fkey" FOREIGN KEY ("discountApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
