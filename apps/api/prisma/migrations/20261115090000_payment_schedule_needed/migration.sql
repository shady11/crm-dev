-- AlterEnum
-- E2E-4: Finance is told when an activated deal needs a payment schedule.
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_SCHEDULE_NEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_SCHEDULE_CREATED';
