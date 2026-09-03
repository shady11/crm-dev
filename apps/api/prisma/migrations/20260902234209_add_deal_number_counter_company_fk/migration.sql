-- AddForeignKey
ALTER TABLE "DealNumberCounter" ADD CONSTRAINT "DealNumberCounter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
