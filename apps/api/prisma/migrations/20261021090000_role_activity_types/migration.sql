-- CA-12: role changes in the company activity log.
ALTER TYPE "ActivityType" ADD VALUE 'ROLE_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'ROLE_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'ROLE_PERMISSIONS_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'ROLE_DELETED';
