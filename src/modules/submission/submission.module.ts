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
import { Language } from '../language/entities/language.entity';
import { User } from '../user/entities/user.entity';
import { StoragesService } from '../storages/storages.service';
import { Module, forwardRef } from '@nestjs/common';
import { SubmissionQueue } from './enums/submission-event.enum';
import { Contest } from '../contests/entities/contest.entity';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { LtiModule } from '../lti/lti.module';
import { LtiLaunchSession } from '../lti/entities/lti-launch-session.entity';
import { GradingStrategyService } from './strategies/grading-strategy.service';
import { GradingStrategyFactory } from './strategies/grading-strategy.factory';
import { SingleSubmissionStrategy } from './strategies/single-submission.strategy';
import { BestScoreStrategy } from './strategies/best-score.strategy';
import { LatestScoreStrategy } from './strategies/latest-score.strategy';
import { AverageScoreStrategy } from './strategies/average-score.strategy';
import { SubmissionCursorService } from './helpers/submission-cursor.service';

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
    forwardRef(() => LtiModule),
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
    GradingStrategyService,
    GradingStrategyFactory,
    SingleSubmissionStrategy,
    BestScoreStrategy,
    LatestScoreStrategy,
    AverageScoreStrategy,
  ],
  exports: [GradingStrategyService],
})
export class SubmissionModule {}
