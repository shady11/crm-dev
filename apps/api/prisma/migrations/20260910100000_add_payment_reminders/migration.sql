-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_OVERDUE';

-- AlterEnum
ALTER TYPE "NotificationEntityType" ADD VALUE 'PAYMENT_SCHEDULE';

-- CreateEnum
CREATE TYPE "OutboundChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "OutboundMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" "OutboundChannel" NOT NULL,
    "recipientClientId" TEXT NOT NULL,
    "paymentScheduleId" TEXT,
    "templateKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "OutboundMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboundMessage_companyId_idx" ON "OutboundMessage"("companyId");

-- CreateIndex
CREATE INDEX "OutboundMessage_recipientClientId_idx" ON "OutboundMessage"("recipientClientId");

-- CreateIndex
CREATE INDEX "OutboundMessage_paymentScheduleId_idx" ON "OutboundMessage"("paymentScheduleId");

-- CreateIndex
CREATE INDEX "OutboundMessage_createdAt_idx" ON "OutboundMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_recipientClientId_fkey" FOREIGN KEY ("recipientClientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_paymentScheduleId_fkey" FOREIGN KEY ("paymentScheduleId") REFERENCES "PaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
