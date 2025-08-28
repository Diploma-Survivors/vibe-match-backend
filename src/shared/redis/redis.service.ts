import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host') as string,
      port: this.configService.get<number>('redis.port') as number,
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db') as number,
    });
    this.client.on('connect', () => {
      console.log('Redis client connected');
    });
    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  public async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
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
}
