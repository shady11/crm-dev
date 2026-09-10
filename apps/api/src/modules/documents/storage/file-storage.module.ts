import { Module } from '@nestjs/common';

import { FILE_STORAGE_PROVIDER } from './file-storage.interface';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';

@Module({
  providers: [
    LocalDiskStorageProvider,
    {
      provide: FILE_STORAGE_PROVIDER,
      useFactory: (local: LocalDiskStorageProvider) => {
        if (process.env.STORAGE_DRIVER !== 's3') {
          return local;
        }

        return new S3StorageProvider({
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_REGION,
          endpoint: process.env.AWS_S3_ENDPOINT,
        });
      },
      inject: [LocalDiskStorageProvider],
    },
  ],
  exports: [FILE_STORAGE_PROVIDER],
})
export class FileStorageModule {}
