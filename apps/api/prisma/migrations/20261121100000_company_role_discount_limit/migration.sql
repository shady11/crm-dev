-- E2E-24: a company's own discount limit for a built-in role.
CREATE TABLE "CompanyRoleDiscountLimit" (
    "companyId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "discountLimit" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRoleDiscountLimit_pkey" PRIMARY KEY ("companyId","roleId")
);

ALTER TABLE "CompanyRoleDiscountLimit" ADD CONSTRAINT "CompanyRoleDiscountLimit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyRoleDiscountLimit" ADD CONSTRAINT "CompanyRoleDiscountLimit_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
