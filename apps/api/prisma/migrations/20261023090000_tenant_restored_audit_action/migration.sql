-- SA-3: restoring a deleted company is audited like deleting one.
ALTER TYPE "AuditAction" ADD VALUE 'TENANT_RESTORED' AFTER 'TENANT_DELETED';
