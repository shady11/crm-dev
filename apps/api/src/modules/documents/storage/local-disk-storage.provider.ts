import { createReadStream } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import type { Readable } from 'stream';
import { Injectable } from '@nestjs/common';

import type { DocumentOwnerType } from '@/generated/prisma/client';

import { FileStorageProvider } from './file-storage.interface';
import { buildOwnerScopedKey } from './owner-scoped-key';

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
    ownerType: DocumentOwnerType,
    ownerId: string,
    storedName: string,
    buffer: Buffer,
  ): Promise<string> {
    const key = buildOwnerScopedKey(companyId, ownerType, ownerId, storedName);
    const absolutePath = join(UPLOADS_ROOT, key);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return key;
  }

  getStream(relativePath: string): Promise<Readable> {
    return Promise.resolve(createReadStream(join(UPLOADS_ROOT, relativePath)));
  }

  async delete(relativePath: string): Promise<void> {
    await rm(join(UPLOADS_ROOT, relativePath), { force: true });
  }
}
