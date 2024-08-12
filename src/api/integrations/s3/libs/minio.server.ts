import * as MinIo from 'minio';
import { join } from 'path';
import { Readable, Transform } from 'stream';

import { ConfigService, S3 } from '../../../../config/env.config';
import { Logger } from '../../../../config/logger.config';
import { BadRequestException } from '../../../../exceptions';

const logger = new Logger('S3 Service');

const BUCKET = new ConfigService().get<S3>('S3');

interface Metadata extends MinIo.ItemBucketMetadata {
  'Content-Type': string;
}

const minioClient = (() => {
  if (BUCKET?.ENABLE) {
    return new MinIo.Client({
      endPoint: BUCKET.ENDPOINT,
      port: BUCKET.PORT,
      useSSL: BUCKET.USE_SSL,
      accessKey: BUCKET.ACCESS_KEY,
      secretKey: BUCKET.SECRET_KEY,
    });
  }
})();

const bucketName = process.env.S3_BUCKET;

const bucketExists = async () => {
  if (minioClient) {
    try {
      const list = await minioClient.listBuckets();
      return list.find((bucket) => bucket.name === bucketName);
    } catch (error) {
      return false;
    }
  }
};

const createBucket = async () => {
  if (minioClient) {
    try {
      const exists = await bucketExists();
      if (!exists) {
        await minioClient.makeBucket(bucketName);
      }

      logger.info(`S3 Bucket ${bucketName} - ON`);
      return true;
    } catch (error) {
      logger.error('S3 ERROR:');
      logger.error(error);
      return false;
    }
  }
};

createBucket();

const uploadFile = async (fileName: string, file: Buffer | Transform | Readable, size: number, metadata: Metadata) => {
  if (minioClient) {
    const objectName = join('evolution-api', fileName);
    try {
      metadata['custom-header-application'] = 'evolution-api';
      return await minioClient.putObject(bucketName, objectName, file, size, metadata);
    } catch (error) {
      logger.error(error);
      return error;
    }
  }
};

const getObjectUrl = async (fileName: string, expiry?: number) => {
  if (minioClient) {
    try {
      const objectName = join('evolution-api', fileName);
      if (expiry) {
        return await minioClient.presignedGetObject(bucketName, objectName, expiry);
      }
      return await minioClient.presignedGetObject(bucketName, objectName);
    } catch (error) {
      throw new BadRequestException(error?.message);
    }
  }
};

export { BUCKET, getObjectUrl, uploadFile };
