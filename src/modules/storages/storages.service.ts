// Built-in
import * as fs from 'node:fs/promises';
import * as readline from 'node:readline';
import { Readable } from 'node:stream';

// NestJS
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Third-party
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Progress, Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Relative imports
import { FileUploadOptions } from './interfaces/file-update-options.interface';

export interface UploadProgress {
  loaded: number;
  total?: number;
  percent: number;
}

@Injectable()
export class StoragesService {
  private readonly logger = new Logger(StoragesService.name);
  private readonly client: S3Client;
  private readonly useAWS: boolean;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('aws.s3.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.s3.secretAccessKey',
    );
    const region = this.configService.get<string>('aws.s3.region');
    this.useAWS = this.configService.get<boolean>('useAWS')!;

    const clientConfig: S3ClientConfig = {
      region,
    };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
  }

  async upload({ bucket, key, file }: FileUploadOptions) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
      }),
    );
  }

  async uploadStream(
    bucket: string,
    key: string,
    stream: Readable,
    contentType: string = 'application/x-ndjson',
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ location: string }> {
    this.logger.log(`Starting upload to s3://${bucket}/${key}`);

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
      },
      partSize: 10 * 1024 * 1024, // 10MB parts
      queueSize: 4, // Upload 4 parts in parallel
    });

    // Track progress
    upload.on('httpUploadProgress', (progress: Progress) => {
      const percent =
        progress.total && progress.loaded
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;

      this.logger.debug(
        `Upload progress: ${percent}% (${progress.loaded}/${progress.total || '?'} bytes)`,
      );

      if (onProgress) {
        onProgress({
          loaded: progress.loaded ?? 0,
          total: progress.total,
          percent,
        });
      }
    });

    try {
      const result = await upload.done();

      this.logger.log(`Upload completed: ${result.Location ?? key}`);

      return {
        location: result.Location ?? this.getObjectUrl(bucket, key),
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${(error as Error)?.message}`);
      throw error;
    }
  }

  async delete(bucket: string, key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  async getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn?: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn:
        expiresIn ??
        this.configService.get<number>('aws.s3.presignedUrlExpiresIn'),
    });
  }

  getKeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.slice(1);
  }

  getObjectUrl(bucket: string, key: string) {
    const region = this.configService.get<string>('aws.s3.region');
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  // TODO: Test later
  async *streamLines(bucket: string, key: string): AsyncGenerator<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.client.send(command);
    const bodyStream = response.Body as NodeJS.ReadableStream;

    const rl = readline.createInterface({
      input: bodyStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      yield line.trim();
    }
  }

  async readFile(bucketOrPath: string, key?: string): Promise<Buffer> {
    if (this.useAWS) {
      if (!key) throw new Error('Missing S3 key');

      const command = new GetObjectCommand({ Bucket: bucketOrPath, Key: key });
      const response = await this.client.send(command);

      const stream = response.Body as Readable;
      const chunks: Uint8Array[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    }

    return fs.readFile(bucketOrPath);
  }

  async readAuto(source: string): Promise<Buffer> {
    if (this.useAWS) {
      const url = new URL(source);
      const bucket = url.hostname.split('.')[0];
      const key = url.pathname.substring(1);
      return this.readFile(bucket, key);
    }
    return this.readFile(source);
  }
}
