import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host') as string,
      port: this.configService.get<number>('redis.port') as number,
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db') as number,
    });
    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });
    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  public async set(
    key: string,
    value: string,
    ttlMilliseconds?: number,
  ): Promise<'OK' | null> {
    if (ttlMilliseconds) {
      return this.client.set(key, value, 'PX', ttlMilliseconds);
    } else {
      return this.client.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  public keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  public deleteByPattern(pattern: string): Promise<void> {
    const pipelinePromises: Promise<any>[] = [];

    const stream = this.client.scanStream({
      match: pattern,
    });

    stream.on('data', (keys: string[]) => {
      if (keys.length) {
        const pipeline = this.client.pipeline();

        keys.forEach((key) => {
          pipeline.del(key);
        });

        pipelinePromises.push(
          pipeline.exec().catch((err) => {
            this.logger.error('Error deleting keys:', err);
            throw err;
          }),
        );
      }
    });

    return new Promise<void>((resolve, reject) => {
      stream.on('end', () => {
        Promise.all(pipelinePromises)
          .then(() => resolve())
          .catch((err) =>
            reject(err instanceof Error ? err : new Error(String(err))),
          );
      });
      stream.on('error', (err) =>
        err instanceof Error ? err : new Error(String(err)),
      );
    });
  }

  public async hset(
    key: string,
    field: string,
    value: string,
  ): Promise<number> {
    return this.client.hset(key, field, value);
  }

  public async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  public async hkeys(key: string): Promise<string[]> {
    return this.client.hkeys(key);
  }

  public async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  public async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  public async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }
}
