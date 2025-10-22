import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import { FileUploadOptions } from './interfaces/file-update-options.interface';

@Injectable()
export class StoragesService {
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('aws.s3.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.s3.secretAccessKey',
    );
    const region = this.configService.get<string>('aws.s3.region');

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

  async delete(bucket: string, key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
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

  async *streamLinesLocal(filePath: string): AsyncGenerator<string> {
    const fileStream = fs.createReadStream(filePath, {
      encoding: 'utf-8',
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      yield line.trim();
    }
  }
}
