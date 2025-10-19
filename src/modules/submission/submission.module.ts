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
import { Language } from '../language/entities/language.entity';
import { User } from '../user/entities/user.entity';
import { StoragesService } from '../storages/storages.service';
import { Module } from '@nestjs/common';
import { SubmissionQueue } from './enums/submission-event.enum';
import { Contest } from '../contests/entities/contest.entity';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { LtiModule } from '../lti/lti.module';
import { LtiLaunchSession } from '../lti/entities/lti-launch-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      Problem,
      Language,
      User,
      Contest,
      ContestParticipation,
      LtiLaunchSession,
    ]),
    Judge0Module,
    RedisModule,
    LtiModule,
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
      name: SubmissionQueue.FINALIZE,
    }),
  ],
  controllers: [SubmissionController],
  providers: [
    SubmissionFinalizeProcessor,
    RedisKeys,
    CallbackProcessor,
    SubmissionService,
    SubmissionsSseService,
    StoragesService,
  ],
  exports: [SubmissionService],
})
export class SubmissionModule {}
