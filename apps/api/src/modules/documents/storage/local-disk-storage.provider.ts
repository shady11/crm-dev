import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Readable } from 'stream';
import { Injectable } from '@nestjs/common';

import { FileStorageProvider } from './file-storage.interface';

export const UPLOADS_ROOT =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'documents');

/**
 * The original (and still the default) storage backend: this server's own
 * disk. Fine for a single-instance pilot; files do not survive a redeploy
 * or a second instance, which is exactly why S3StorageProvider exists as
 * the alternative for production — see STORAGE_DRIVER in .env.example.
 */
@Injectable()
export class LocalDiskStorageProvider implements FileStorageProvider {
  async save(
    companyId: string,
    storedName: string,
    buffer: Buffer,
  ): Promise<string> {
    const dir = join(UPLOADS_ROOT, companyId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, storedName), buffer);
    return join(companyId, storedName);
  }

  getStream(relativePath: string): Promise<Readable> {
    return Promise.resolve(createReadStream(join(UPLOADS_ROOT, relativePath)));
  }
}
