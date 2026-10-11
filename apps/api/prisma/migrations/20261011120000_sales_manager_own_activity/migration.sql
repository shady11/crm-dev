-- Sales Managers see their own actions in the activity log ("My activity")
-- instead of every action in their branch: activities.view_own replaces
-- activities.view on the built-in role. The branch-wide feed stays with the
-- Sales Head and Company Admin. Custom roles keep whatever they were given.
--
-- As in 20261010090000: the permission row is inserted here because
-- RbacService.syncCatalog only runs on boot, after migrations.

INSERT INTO "Permission" (id, key, module, action, description)
VALUES (gen_random_uuid(), 'activities.view_own', 'activities', 'view_own', 'View your own activity')
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
SELECT r.id, p.id, now()
FROM "Role" r, "Permission" p
WHERE r."companyId" IS NULL AND r.name = 'Sales Manager' AND p.key = 'activities.view_own'
ON CONFLICT DO NOTHING;

DELETE FROM "RolePermission" rp
USING "Role" r, "Permission" p
WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  AND r."companyId" IS NULL AND r.name = 'Sales Manager' AND p.key = 'activities.view';
