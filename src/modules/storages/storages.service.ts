import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { FileUploadOptions } from './interfaces/file-update-options.interface';
import * as readline from 'node:readline';

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
}
