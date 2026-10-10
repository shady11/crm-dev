-- Sales Managers may create tasks again, but only assigned to themselves
-- (tasks.create_own, enforced in TasksService.create): their own reminders
-- and follow-ups. Handing work to someone else still needs tasks.create,
-- which 20261003090000 removed from the role and stays removed.
--
-- As in that migration: the permission row is inserted here because
-- RbacService.syncCatalog only runs on boot, after migrations, and the
-- built-in role seeded on an earlier boot is updated once here.

INSERT INTO "Permission" (id, key, module, action, description)
VALUES (gen_random_uuid(), 'tasks.create_own', 'tasks', 'create_own', 'Create tasks assigned to yourself')
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
SELECT r.id, p.id, now()
FROM "Role" r, "Permission" p
WHERE r."companyId" IS NULL AND r.name = 'Sales Manager' AND p.key = 'tasks.create_own'
ON CONFLICT DO NOTHING;
