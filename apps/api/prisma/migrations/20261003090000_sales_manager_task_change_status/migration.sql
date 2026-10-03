-- Sales Managers keep seeing every task in their branch but may now only move
-- the tasks assigned to them (tasks.change_status — see
-- TasksService.updateStatus). They no longer create or edit tasks.
--
-- RbacService.seedDefaultRolesIfMissing never touches a role that already
-- exists, so the built-in "Sales Manager" role seeded on an earlier boot is
-- updated here once. The permission row is inserted up front because
-- RbacService.syncCatalog only runs on boot, after migrations.

INSERT INTO "Permission" (id, key, module, action, description)
VALUES (gen_random_uuid(), 'tasks.change_status', 'tasks', 'change_status', 'Move tasks assigned to you between statuses')
ON CONFLICT (key) DO NOTHING;

DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT id FROM "Role" WHERE "companyId" IS NULL AND name = 'Sales Manager')
  AND "permissionId" IN (SELECT id FROM "Permission" WHERE key IN ('tasks.create', 'tasks.edit'));

INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
SELECT r.id, p.id, now()
FROM "Role" r, "Permission" p
WHERE r."companyId" IS NULL AND r.name = 'Sales Manager' AND p.key = 'tasks.change_status'
ON CONFLICT DO NOTHING;
