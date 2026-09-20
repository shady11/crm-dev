import { DocumentsCleanupService } from './documents-cleanup.service';

/**
 * DocumentsCleanupService is what actually frees disk/bucket space for a
 * soft-deleted document — DocumentsService.remove() only ever sets
 * deletedAt, on purpose, so a document stays recoverable until this cron
 * catches up with it after the retention window.
 */
describe('DocumentsCleanupService', () => {
  function build(opts: { expired?: unknown[] } = {}) {
    const prisma = {
      document: {
        findMany: jest.fn().mockResolvedValue(opts.expired ?? []),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = {
      save: jest.fn(),
      getStream: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const service = new DocumentsCleanupService(prisma as any, storage);
    return { service, prisma, storage };
  }

  it('only selects documents soft-deleted past the retention window that were never purged', async () => {
    const { service, prisma } = build();
    await service.purgeExpiredSoftDeletes();

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: { lte: expect.any(Date) }, purgedAt: null },
      }),
    );
  });

  it('deletes the file from storage and marks the row purged for each expired document', async () => {
    const { service, prisma, storage } = build({
      expired: [{ id: 'doc-1', path: 'company-1/lead/lead-1/a.pdf' }],
    });

    await service.purgeExpiredSoftDeletes();

    expect(storage.delete).toHaveBeenCalledWith('company-1/lead/lead-1/a.pdf');
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { purgedAt: expect.any(Date) },
    });
  });

  it('never hard-deletes the Document row — only sets purgedAt', async () => {
    const { service, prisma } = build({
      expired: [{ id: 'doc-1', path: 'company-1/lead/lead-1/a.pdf' }],
    });

    await service.purgeExpiredSoftDeletes();

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { purgedAt: expect.any(Date) } }),
    );
  });

  it('leaves a document unpurged in the DB when its storage delete fails, so the next run retries it', async () => {
    const { service, prisma, storage } = build({
      expired: [{ id: 'doc-1', path: 'company-1/lead/lead-1/a.pdf' }],
    });
    storage.delete.mockRejectedValueOnce(new Error('disk unavailable'));

    await service.purgeExpiredSoftDeletes();

    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it('keeps purging the rest of the batch after one document fails', async () => {
    const { service, prisma, storage } = build({
      expired: [
        { id: 'doc-1', path: 'company-1/lead/lead-1/a.pdf' },
        { id: 'doc-2', path: 'company-1/lead/lead-2/b.pdf' },
      ],
    });
    storage.delete.mockRejectedValueOnce(new Error('disk unavailable'));

    await service.purgeExpiredSoftDeletes();

    expect(prisma.document.update).toHaveBeenCalledTimes(1);
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'doc-2' } }),
    );
  });
});
