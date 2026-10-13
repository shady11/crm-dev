
-- CreateEnum
CREATE TYPE "UnitPriceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationEntityType" ADD VALUE 'UNIT_PRICE_REQUEST';
ALTER TYPE "NotificationEntityType" ADD VALUE 'UNIT';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'UNIT_PRICE_CHANGE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'UNIT_PRICE_CHANGE_DECIDED';
ALTER TYPE "NotificationType" ADD VALUE 'UNIT_PRICE_CHANGED';

-- CreateTable
CREATE TABLE "UnitPriceRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "UnitPriceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentPrice" DECIMAL(14,2) NOT NULL,
    "requestedPrice" DECIMAL(14,2) NOT NULL,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitPriceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitPriceRequest_companyId_status_idx" ON "UnitPriceRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "UnitPriceRequest_unitId_status_idx" ON "UnitPriceRequest"("unitId", "status");

-- AddForeignKey
ALTER TABLE "UnitPriceRequest" ADD CONSTRAINT "UnitPriceRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPriceRequest" ADD CONSTRAINT "UnitPriceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPriceRequest" ADD CONSTRAINT "UnitPriceRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPriceRequest" ADD CONSTRAINT "UnitPriceRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- At most one request per unit waits for a decision; a new one cancels the
-- old (UnitPriceRequestsService.request), and this backs that up.
CREATE UNIQUE INDEX "UnitPriceRequest_one_pending_per_unit" ON "UnitPriceRequest"("unitId") WHERE "status" = 'PENDING';

-- SH-2: two new permissions. units.edit_price lets a role change a unit's
-- list price; without units.approve_price the change waits for someone who
-- has it. Built-in roles: Company Admin gets both, Sales Head may request.
-- Custom roles get them when an admin grants them. Inserted here because
-- RbacService.syncCatalog only runs on boot, after migrations.
INSERT INTO "Permission" (id, key, module, action, description)
VALUES
  (gen_random_uuid(), 'units.edit_price', 'units', 'edit_price', 'Change a unit''s list price (needs approval without units.approve_price)'),
  (gen_random_uuid(), 'units.approve_price', 'units', 'approve_price', 'Approve or reject list-price changes, and change prices without approval')
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
SELECT r.id, p.id, now()
FROM "Role" r, "Permission" p
WHERE r."companyId" IS NULL
  AND (
    (r.name IN ('Company Admin', 'Sales Head') AND p.key = 'units.edit_price')
    OR (r.name = 'Company Admin' AND p.key = 'units.approve_price')
  )
ON CONFLICT DO NOTHING;
