import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionController } from './submission.controller';
import { RedisModule } from '../../shared/redis/redis.module';
import { Submission } from './entities/submission.entity';
import { Problem } from '../problems/entities/problem.entity';
import { Judge0Module } from '../judge0/judge0.module';
import { RedisKeys } from './helpers/redis-keys.helper';
import { CallbackProcessor } from './helpers/callback.processor';
import { SubmissionFinalizeProcessor } from './events/submission-finalizer.processor';
import { SubmissionService } from './submission.service';
import { SubmissionsSseService } from './events/submission-sse.service';
import { ConfigService } from '@nestjs/config';
import { Language } from './language/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Problem, Language]),
    Judge0Module,
    RedisModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('redis.host');
        const portFromConfig = config.get<number>('redis.port');
        const password = config.get<string>('redis.password');

        const port = Number.isInteger(portFromConfig)
          ? portFromConfig!
          : parseInt(process.env.REDIS_PORT ?? '6379', 10);
        return {
          connection: {
            host,
            port,
            password: password || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'submission-finalize',
    }),
  ],
  controllers: [SubmissionController],
  providers: [
    SubmissionFinalizeProcessor,
    RedisKeys,
    CallbackProcessor,
    SubmissionService,
    SubmissionsSseService,
  ],
})
export class SubmissionModule {}
