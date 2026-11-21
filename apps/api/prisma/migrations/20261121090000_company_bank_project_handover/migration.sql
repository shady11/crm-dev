-- E2E-22: bank details for the documents, and a project's planned handover
-- date for the sale contract. All optional.
ALTER TABLE "Company" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Company" ADD COLUMN "bankAccount" TEXT;
ALTER TABLE "Company" ADD COLUMN "bankBic" TEXT;

ALTER TABLE "Project" ADD COLUMN "handoverDate" DATE;
