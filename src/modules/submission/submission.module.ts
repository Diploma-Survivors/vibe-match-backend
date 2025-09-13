import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionController } from './submission.controller';
import { RedisModule } from '../../shared/redis/redis.module';
import { Submission } from './entities/submission.entity';
import { Problem } from '../problems/entities/problem.entity';
import { Judge0Module } from '../judge0/judge0.module';
import { RedisKeys } from './helpers/redis-keys.helper';
import { CallbackProcessor } from './callback.processor';
import { SubmissionFinalizeProcessor } from './submission-finalizer.controller';
import { SubmissionService } from './submission.service';
import { SubmissionsSseService } from './events/submission-events.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Problem]),
    Judge0Module,
    RedisModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
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
