import type { Readable } from 'stream';
import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { FileStorageProvider } from './file-storage.interface';

export interface S3ProviderConfig {
  bucket: string;
  region: string;
  endpoint?: string;
}

/**
 * Production storage backend: an S3-compatible bucket (AWS S3, or a
 * compatible provider like MinIO/DigitalOcean Spaces via AWS_S3_ENDPOINT).
 * Keys are companyId/storedName, same layout LocalDiskStorageProvider uses
 * on disk, so Document.path means the same thing under either backend.
 */
@Injectable()
export class S3StorageProvider implements FileStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3ProviderConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      // Path-style is required by most non-AWS S3-compatible providers
      // (MinIO, DigitalOcean Spaces); AWS itself accepts it too.
      forcePathStyle: Boolean(config.endpoint),
    });
  }

  async save(
    companyId: string,
    storedName: string,
    buffer: Buffer,
  ): Promise<string> {
    const key = `${companyId}/${storedName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
      }),
    );

    return key;
  }

  async getStream(relativePath: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: relativePath }),
    );

    // In the Node.js runtime (as opposed to browser/edge), Body is
    // always a Node Readable — the SDK's other possible Body types
    // (ReadableStream, Blob) only occur in those other runtimes.
    return result.Body as Readable;
  }
}
