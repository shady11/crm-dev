import type { DocumentOwnerType } from '@/generated/prisma/client';

/**
 * Builds the storage key both providers use, organizing files under each
 * company by the entity they're attached to (companyId/ownerType/ownerId/
 * storedName) instead of dumping a company's entire history into one flat
 * directory. `ownerType` is lower-cased for a tidier on-disk/bucket layout;
 * it round-trips fine since callers only ever read back the full key
 * (stored verbatim in Document.path), never parse it.
 */
export function buildOwnerScopedKey(
  companyId: string,
  ownerType: DocumentOwnerType,
  ownerId: string,
  storedName: string,
): string {
  return [companyId, ownerType.toLowerCase(), ownerId, storedName].join('/');
}
