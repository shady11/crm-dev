import type { Readable } from 'stream';

/**
 * Injection token for FileStorageProvider — same pattern as
 * payment-reminders' MESSAGE_PROVIDER, so DocumentsService and
 * DocumentGenerationService never know or care whether a file landed on
 * this server's disk or in an S3 bucket.
 */
export const FILE_STORAGE_PROVIDER = Symbol('FILE_STORAGE_PROVIDER');

export interface FileStorageProvider {
  /**
   * Persists the buffer under a company-scoped key and returns that key
   * (stored in Document.path) — never an absolute path, so it stays
   * meaningful regardless of which backend wrote it.
   */
  save(companyId: string, storedName: string, buffer: Buffer): Promise<string>;

  /** Opens a readable stream for a previously saved key. */
  getStream(relativePath: string): Promise<Readable>;
}
