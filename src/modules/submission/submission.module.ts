// NestJS
import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Relative imports
import { RedisModule } from '../../shared/redis/redis.module';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { ContestProblem } from '../contests/entities/contest-problem.entity';
import { Contest } from '../contests/entities/contest.entity';
import { ContestsModule } from '../contests/contests.module';
import { Judge0Module } from '../judge0/judge0.module';
import { Language } from '../language/entities/language.entity';
import { LtiLaunchSession } from '../lti/entities/lti-launch-session.entity';
import { LtiModule } from '../lti/lti.module';
import { Problem } from '../problems/entities/problem.entity';
import { StoragesService } from '../storages/storages.service';
import { User } from '../user/entities/user.entity';
import { Submission } from './entities/submission.entity';
import { SubmissionQueue } from './enums/submission-event.enum';
import { SubmissionFinalizeProcessor } from './events/submission-finalizer.processor';
import { SubmissionsSseService } from './events/submission-sse.service';
import { CallbackProcessor } from './helpers/callback.processor';
import { TestcaseParserUtil } from './helpers/parse-test-file-util';
import { RedisKeys } from './helpers/redis-keys.helper';
import { SubmissionCursorService } from './helpers/submission-cursor.service';
import { AverageScoreStrategy } from './strategies/average-score.strategy';
import { BestScoreStrategy } from './strategies/best-score.strategy';
import { GradingStrategyFactory } from './strategies/grading-strategy.factory';
import { GradingStrategyService } from './strategies/grading-strategy.service';
import { LatestScoreStrategy } from './strategies/latest-score.strategy';
import { SingleSubmissionStrategy } from './strategies/single-submission.strategy';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      Problem,
      Language,
      User,
      Contest,
      ContestParticipation,
      ContestProblem,
      LtiLaunchSession,
    ]),
    Judge0Module,
    RedisModule,
    forwardRef(() => LtiModule),
    forwardRef(() => ContestsModule),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('redis.host');
        const portFromConfig = config.get<number>('redis.port');
        const password = config.get<string>('redis.password');

        const port = Number.isInteger(portFromConfig)
          ? portFromConfig!
          : Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
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
    SubmissionCursorService,
    StoragesService,
    TestcaseParserUtil,
    GradingStrategyService,
    GradingStrategyFactory,
    SingleSubmissionStrategy,
    BestScoreStrategy,
    LatestScoreStrategy,
    AverageScoreStrategy,
  ],
  exports: [SubmissionService, GradingStrategyService, GradingStrategyFactory],
})
export class SubmissionModule {}
