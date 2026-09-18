-- Unlocks the five built-in ("system") roles: a platform administrator can
-- now rename, re-permission, or delete them exactly like any other global
-- role (see RbacService and the Role model comment). isSystem stays as an
-- informational "Built-in" label only.
--
-- Moves discretionary discount ceilings off Company (which held one fixed
-- pair of thresholds for the whole tenant) and onto Role.discountLimit (one
-- per role, shared by every tenant using that global role — a tenant that
-- wants its own threshold clones the role into a custom one). This is a
-- deliberate behavior change: a company that had customized its
-- salesManagerDiscountLimit/salesHeadDiscountLimit away from the defaults
-- loses that customization here — the shared "Sales Manager"/"Sales Head"
-- roles are backfilled with the schema's old defaults (5%/15%), not each
-- company's prior value. A company that still needs a different threshold
-- clones the role and sets discountLimit on its own copy.

-- Role: add discountLimit, isDefaultCompanyAdmin, isPlatformRole
ALTER TABLE "Role" ADD COLUMN "discountLimit" DECIMAL(5,2);
ALTER TABLE "Role" ADD COLUMN "isDefaultCompanyAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Role" ADD COLUMN "isPlatformRole" BOOLEAN NOT NULL DEFAULT false;

-- Backfill the structural markers onto whichever built-in roles already
-- exist in this database (they may not, on a database that has never
-- booted the app — RbacService.seedDefaultRolesIfMissing creates them with
-- these flags set correctly on first boot regardless).
UPDATE "Role" SET "isDefaultCompanyAdmin" = true
  WHERE "companyId" IS NULL AND "name" = 'Company Admin';

UPDATE "Role" SET "isPlatformRole" = true
  WHERE "companyId" IS NULL AND "name" = 'Super Admin';

UPDATE "Role" SET "discountLimit" = 15
  WHERE "companyId" IS NULL AND "name" = 'Sales Head';

UPDATE "Role" SET "discountLimit" = 5
  WHERE "companyId" IS NULL AND "name" = 'Sales Manager';

-- Company: the two fixed discount-limit columns are replaced by the above.
ALTER TABLE "Company" DROP COLUMN "salesManagerDiscountLimit";
ALTER TABLE "Company" DROP COLUMN "salesHeadDiscountLimit";
