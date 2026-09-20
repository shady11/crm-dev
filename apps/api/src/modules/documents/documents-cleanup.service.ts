import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '@/database/prisma.service';
import { getDocumentRetentionDays } from '@/config/env.config';

import {
  FILE_STORAGE_PROVIDER,
  FileStorageProvider,
} from './storage/file-storage.interface';

/**
 * Purges the underlying file of a soft-deleted document once it has aged
 * past DOCUMENT_RETENTION_DAYS. remove() in DocumentsService only sets
 * deletedAt — it deliberately never touches storage, so a document stays
 * fully recoverable for the retention window. This is what actually frees
 * the disk/bucket space, on a delay long enough to survive an accidental
 * delete or a compliance hold. The Document row itself is kept (only
 * purgedAt is set) so upload history and activity logs stay intact even
 * after the bytes are gone.
 */
@Injectable()
export class DocumentsCleanupService {
  private readonly logger = new Logger(DocumentsCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storage: FileStorageProvider,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredSoftDeletes() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - getDocumentRetentionDays());

    const expired = await this.prisma.document.findMany({
      where: { deletedAt: { lte: cutoff }, purgedAt: null },
      select: { id: true, path: true },
    });

    let purged = 0;
    for (const document of expired) {
      try {
        await this.storage.delete(document.path);
        await this.prisma.document.update({
          where: { id: document.id },
          data: { purgedAt: new Date() },
        });
        purged++;
      } catch (error) {
        // Left for the next run to retry — deletedAt/purgedAt in the where
        // clause above naturally re-selects anything that failed here.
        this.logger.error(
          `Failed to purge document ${document.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.log(
      `Purged ${purged}/${expired.length} expired soft-deleted document file(s)`,
    );
  }
}
