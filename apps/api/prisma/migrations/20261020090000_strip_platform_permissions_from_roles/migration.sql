-- CA-1: companies.manage, setting_options.manage and audit_log.view belong to
-- the platform operator, who passes every check through User.isSuperAdmin.
-- No role should carry them; a company role that did gave its holders other
-- tenants' data. RbacService now refuses them on any role and ignores them in
-- a user's effective permissions; this removes any grant made before that.
DELETE FROM "RolePermission"
WHERE "permissionId" IN (
  SELECT id FROM "Permission"
  WHERE key IN ('companies.manage', 'setting_options.manage', 'audit_log.view')
);
