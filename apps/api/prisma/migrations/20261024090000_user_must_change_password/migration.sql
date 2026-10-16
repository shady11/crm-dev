-- SA-6: a password set by someone else must be replaced by its owner.
-- Existing accounts are left as they are (false).
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
