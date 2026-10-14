-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_EXTENSION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_EXTENDED';

-- SH-11: extending a reservation past the company's extension limit is its
-- own permission. Built-in Company Admin and Sales Head get it; custom roles
-- get it when an admin grants it. Inserted here because
-- RbacService.syncCatalog only runs on boot, after migrations.
INSERT INTO "Permission" (id, key, module, action, description)
VALUES
  (gen_random_uuid(), 'deals.extend_beyond_limit', 'deals', 'extend_beyond_limit', 'Extend a reservation past the company''s extension limit, with a reason')
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
SELECT r.id, p.id, now()
FROM "Role" r, "Permission" p
WHERE r."companyId" IS NULL
  AND r.name IN ('Company Admin', 'Sales Head')
  AND p.key = 'deals.extend_beyond_limit'
ON CONFLICT DO NOTHING;
