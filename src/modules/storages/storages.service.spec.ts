import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'node:fs/promises';
import { Readable } from 'stream';
import { StoragesService } from './storages.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('node:fs/promises');

describe('StoragesService', () => {
  let service: StoragesService;
  let s3Client: S3Client;

  const mockAwsConfig: Partial<ConfigService> = {
    get: jest.fn((key: string) => {
      if (key === 'aws.s3.accessKeyId') return 'accessKeyId';
      if (key === 'aws.s3.secretAccessKey') return 'secretAccessKey';
      if (key === 'aws.s3.region') return 'region';
      if (key === 'useAWS') return true;
      return null;
    }),
  };

  const mockLocalConfig: Partial<ConfigService> = {
    get: jest.fn((key: string) => {
      if (key === 'useAWS') return false;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoragesService,
        { provide: ConfigService, useValue: mockAwsConfig },
      ],
    }).compile();

    service = module.get<StoragesService>(StoragesService);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    s3Client = (S3Client as jest.Mock).mock.instances[0];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload a file to S3', async () => {
      const send = jest.fn();
      s3Client.send = send;
      const options = {
        bucket: 'bucket',
        key: 'key',
        file: Buffer.from('test'),
      };
      await service.upload(options);
      expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });
  });

  describe('delete', () => {
    it('should delete a file from S3', async () => {
      const send = jest.fn();
      s3Client.send = send;
      await service.delete('bucket', 'key');
      expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });
  });

  describe('getKeyFromUrl', () => {
    it('should extract key from S3 url', () => {
      const url = 'https://bucket.s3.region.amazonaws.com/key';
      const key = service.getKeyFromUrl(url);
      expect(key).toBe('key');
    });
  });

  describe('getObjectUrl', () => {
    it('should get object url', () => {
      const url = service.getObjectUrl('bucket', 'key');
      expect(url).toBe('https://bucket.s3.region.amazonaws.com/key');
    });
  });

  describe('streamLines', () => {
    it('should stream lines from an S3 object', async () => {
      const bodyStream = Readable.from('line1\nline2\nline3');
      const send = jest.fn().mockResolvedValue({ Body: bodyStream });
      s3Client.send = send;

      const lines: string[] = [];
      for await (const line of service.streamLines('bucket', 'key')) {
        lines.push(line);
      }

      expect(lines).toEqual(['line1', 'line2', 'line3']);
      expect(send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    });
  });

  describe('readFile', () => {
    it('should read file from S3', async () => {
      const send = jest.fn().mockResolvedValue({
        Body: Readable.from(Buffer.from('test')),
      });
      s3Client.send = send;
      const buffer = await service.readFile('bucket', 'key');
      expect(send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
      expect(buffer.toString()).toBe('test');
    });

    it('should read file from local filesystem', async () => {
      const localService = new StoragesService(
        mockLocalConfig as ConfigService,
      );
      const buffer = Buffer.from('test');
      (fs.readFile as jest.Mock).mockResolvedValue(buffer);
      const result = await localService.readFile('path');
      expect(result).toBe(buffer);
      expect(fs.readFile).toHaveBeenCalledWith('path');
    });
  });

  describe('readAuto', () => {
    it('should read from S3 URL', async () => {
      const url = 'https://bucket.s3.region.amazonaws.com/key';
      const buffer = Buffer.from('test');
      const readFileSpy = jest
        .spyOn(service, 'readFile')
        .mockResolvedValue(buffer);
      const result = await service.readAuto(url);
      expect(result).toBe(buffer);
      expect(readFileSpy).toHaveBeenCalledWith('bucket', 'key');
    });

    it('should read from local path', async () => {
      const localService = new StoragesService(
        mockLocalConfig as ConfigService,
      );
      const path = '/path/to/file';
      const buffer = Buffer.from('test');

      const readFileSpy = jest
        .spyOn(localService, 'readFile')
        .mockResolvedValue(buffer);

      const result = await localService.readAuto(path);
      expect(result).toBe(buffer);
      expect(readFileSpy).toHaveBeenCalledWith(path);
    });
  });
});
