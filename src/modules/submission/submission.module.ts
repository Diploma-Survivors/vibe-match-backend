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
import { Module } from '@nestjs/common';
import { Contest } from '../contests/entities/contest.entity';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { SubmissionCursorService } from './helpers/submission-cursor.service';
import { SubmissionQueue } from './enums/submission-event.enum';
import { TestcaseParserUtil } from './helpers/parse-test-file-util';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      Problem,
      Language,
      User,
      Contest,
      ContestParticipation,
    ]),
    Judge0Module,
    RedisModule,
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
  ],
})
export class SubmissionModule {}
