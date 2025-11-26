import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../modules/auth/auth.module';
import { RefreshTokenModule } from '../../modules/auth/refresh-token.module';
import { UserModule } from '../../modules/user/user.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { ContestProblemResult } from '../contests/entities/contest-problem-result.entity';
import { ContestsModule } from '../contests/contests.module';
import { CourseModule } from '../course/course.module';
import { ProblemsModule } from '../problems/problems.module';
import { Submission } from '../submission/entities/submission.entity';
import { SubmissionModule } from '../submission/submission.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { AgsService } from './ags/ags.service';
import { LtiLaunchSession } from './entities/lti-launch-session.entity';
import { KeysService } from './keys.service';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LtiLaunchSession,
      Submission,
      ContestParticipation,
      ContestProblemResult,
    ]),
    UserModule,
    AuthModule,
    RedisModule,
    CourseModule,
    UserCourseModule,
    RefreshTokenModule,
    ProblemsModule,
    forwardRef(() => ContestsModule),
    forwardRef(() => SubmissionModule),
  ],
  controllers: [LtiController],
  providers: [LtiService, KeysService, AgsService],
  exports: [AgsService],
})
export class LtiModule {}
