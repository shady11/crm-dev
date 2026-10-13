-- CreateEnum
CREATE TYPE "LeadLostReason" AS ENUM ('PRICE', 'COMPETITOR', 'LOCATION', 'LAYOUT', 'FINANCING', 'POSTPONED', 'UNREACHABLE', 'DUPLICATE', 'OTHER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "lostAt" TIMESTAMP(3),
ADD COLUMN     "lostNote" TEXT,
ADD COLUMN     "lostReason" "LeadLostReason";

