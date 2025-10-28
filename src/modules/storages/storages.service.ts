import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as readline from 'node:readline';
import { Readable } from 'node:stream';
import { FileUploadOptions } from './interfaces/file-update-options.interface';

@Injectable()
export class StoragesService {
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
