import type { Readable } from 'stream';

import type { DocumentOwnerType } from '@/generated/prisma/client';

/**
 * Injection token for FileStorageProvider — same pattern as
 * payment-reminders' MESSAGE_PROVIDER, so DocumentsService and
 * DocumentGenerationService never know or care whether a file landed on
 * this server's disk or in an S3 bucket.
 */
export const FILE_STORAGE_PROVIDER = Symbol('FILE_STORAGE_PROVIDER');

export interface FileStorageProvider {
  /**
   * Persists the buffer under a key scoped by company and owner
   * (companyId/ownerType/ownerId/storedName) and returns that key (stored
   * in Document.path) — never an absolute path, so it stays meaningful
   * regardless of which backend wrote it. Owner-scoping keeps a company's
   * files organized per lead/client/deal/project/unit instead of dumped
   * into one flat directory.
   */
  save(
    companyId: string,
    ownerType: DocumentOwnerType,
    ownerId: string,
    storedName: string,
    buffer: Buffer,
  ): Promise<string>;

  /** Opens a readable stream for a previously saved key. */
  getStream(relativePath: string): Promise<Readable>;

  /**
   * Removes a previously saved key. Must not throw when the key is already
   * gone — DocumentsCleanupService retries a purge that partially failed
   * (e.g. the DB update after a successful delete), so a second delete of
   * the same key is expected and should be a no-op, not an error.
   */
  delete(relativePath: string): Promise<void>;
}
