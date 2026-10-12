-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedById" TEXT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- FIN-3: voiding a mistyped payment, for Finance and Company Admin on the
-- built-in roles. Custom roles get it when an admin grants it. As in
-- 20261011120000, the permission row is inserted here because
-- RbacService.syncCatalog only runs on boot, after migrations.
INSERT INTO "Permission" (id, key, module, action, description)
VALUES (gen_random_uuid(), 'deals.void_payments', 'deals', 'void_payments', 'Void a mistyped payment, with a reason')
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
SELECT r.id, p.id, now()
FROM "Role" r, "Permission" p
WHERE r."companyId" IS NULL AND r.name IN ('Finance', 'Company Admin') AND p.key = 'deals.void_payments'
ON CONFLICT DO NOTHING;
