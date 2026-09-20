import { access, mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { DocumentOwnerType } from '@/generated/prisma/client';

/**
 * UPLOADS_ROOT is read from process.env.UPLOADS_DIR at module load time, so
 * the module has to be freshly required per test after the env var is set,
 * rather than importing LocalDiskStorageProvider at the top of the file.
 */
describe('LocalDiskStorageProvider', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'crm-uploads-'));
    process.env.UPLOADS_DIR = root;
    jest.resetModules();
  });

  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(root, { recursive: true, force: true });
  });

  it('scopes a saved file under companyId/ownerType/ownerId, not one flat company folder', async () => {
    const { LocalDiskStorageProvider } =
      await import('./local-disk-storage.provider');
    const provider = new LocalDiskStorageProvider();

    const key = await provider.save(
      'company-1',
      DocumentOwnerType.DEAL,
      'deal-1',
      'stored.pdf',
      Buffer.from('%PDF-fake'),
    );

    expect(key).toBe('company-1/deal/deal-1/stored.pdf');
    const written = await readFile(join(root, key));
    expect(written.toString()).toBe('%PDF-fake');
  });

  it('keeps different owners of the same company in separate directories', async () => {
    const { LocalDiskStorageProvider } =
      await import('./local-disk-storage.provider');
    const provider = new LocalDiskStorageProvider();

    const leadKey = await provider.save(
      'company-1',
      DocumentOwnerType.LEAD,
      'lead-1',
      'a.pdf',
      Buffer.from('lead-file'),
    );
    const clientKey = await provider.save(
      'company-1',
      DocumentOwnerType.CLIENT,
      'client-1',
      'a.pdf',
      Buffer.from('client-file'),
    );

    expect(leadKey).not.toBe(clientKey);
    expect((await readFile(join(root, leadKey))).toString()).toBe('lead-file');
    expect((await readFile(join(root, clientKey))).toString()).toBe(
      'client-file',
    );
  });

  it('reads back a previously saved file by its returned key', async () => {
    const { LocalDiskStorageProvider } =
      await import('./local-disk-storage.provider');
    const provider = new LocalDiskStorageProvider();

    const key = await provider.save(
      'company-1',
      DocumentOwnerType.PROJECT,
      'project-1',
      'plan.pdf',
      Buffer.from('plan-contents'),
    );

    const stream = await provider.getStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);

    expect(Buffer.concat(chunks).toString()).toBe('plan-contents');
  });

  it('removes a saved file from disk', async () => {
    const { LocalDiskStorageProvider } =
      await import('./local-disk-storage.provider');
    const provider = new LocalDiskStorageProvider();

    const key = await provider.save(
      'company-1',
      DocumentOwnerType.CLIENT,
      'client-1',
      'a.pdf',
      Buffer.from('to-be-deleted'),
    );

    await provider.delete(key);

    await expect(access(join(root, key))).rejects.toThrow();
  });

  it('does not throw when deleting a key that was never saved', async () => {
    const { LocalDiskStorageProvider } =
      await import('./local-disk-storage.provider');
    const provider = new LocalDiskStorageProvider();

    await expect(
      provider.delete('company-1/lead/lead-1/missing.pdf'),
    ).resolves.toBeUndefined();
  });
});
