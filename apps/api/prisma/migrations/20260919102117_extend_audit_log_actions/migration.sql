-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ROLE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ROLE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ROLE_PERMISSIONS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ROLE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'SETTING_OPTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SETTING_OPTION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SETTING_OPTION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';
