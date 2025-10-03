import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
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

  getObjectUrl(bucket: string, key: string) {
    const region = this.configService.get<string>('aws.s3.region');
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
