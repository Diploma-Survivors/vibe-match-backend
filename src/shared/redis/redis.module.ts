import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

export const REDIS = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    {
      provide: REDIS,
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService, REDIS],
})
export class RedisModule {}
