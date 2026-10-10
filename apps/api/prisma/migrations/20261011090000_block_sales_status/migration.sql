-- CreateEnum
CREATE TYPE "BlockSalesStatus" AS ENUM ('UPCOMING', 'ON_SALE', 'COMPLETED');

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "completionDate" DATE,
ADD COLUMN     "salesStatus" "BlockSalesStatus" NOT NULL DEFAULT 'ON_SALE';

