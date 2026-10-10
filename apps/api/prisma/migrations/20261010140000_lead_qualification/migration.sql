-- What a lead is looking for: budget, rooms, preferred project and how
-- they intend to pay. All optional, so existing leads are unaffected.
ALTER TABLE "Lead" ADD COLUMN "budget" DECIMAL(14,2);
ALTER TABLE "Lead" ADD COLUMN "rooms" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "preferredProjectId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "financingType" "FinancingType";

CREATE INDEX "Lead_companyId_preferredProjectId_idx" ON "Lead"("companyId", "preferredProjectId");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_preferredProjectId_fkey"
    FOREIGN KEY ("preferredProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
