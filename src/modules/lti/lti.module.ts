// NestJS
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Relative imports
import { AuthModule } from '../../modules/auth/auth.module';
import { RefreshTokenModule } from '../../modules/auth/refresh-token.module';
import { UserModule } from '../../modules/user/user.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { ContestsModule } from '../contests/contests.module';
import { CourseModule } from '../course/course.module';
import { ProblemsModule } from '../problems/problems.module';
import { Submission } from '../submission/entities/submission.entity';
import { SubmissionModule } from '../submission/submission.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { AgsService } from './ags/ags.service';
import { LtiLaunchSession } from './entities/lti-launch-session.entity';
import { KeysService } from './keys.service';
import { LtiUtilService } from './lti-util.service';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';
import { RESOURCE_URL_BUILDER } from './strategies/base-resource-url.builder';
import { ContestResourceUrlBuilder } from './strategies/contest-resource-url.builder';
import { ContestContentStrategy } from './strategies/deep-linking-content/contest-content.strategy';
import { DeepLinkingContentStrategyFactory } from './strategies/deep-linking-content/deep-linking-content.factory';
import { ProblemManagementContentStrategy } from './strategies/deep-linking-content/problem-management-content.strategy';
import { DeepLinkingFactory } from './strategies/deep-linking/deep-linking.factory';
import { DefaultDeepLinkingStrategy } from './strategies/deep-linking/default-deep-linking.strategy';
import { ProblemManagementUrlBuilder } from './strategies/problem-management-url.builder';
import { ResourceUrlFactory } from './strategies/resource-url.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([LtiLaunchSession, Submission]),
    UserModule,
    AuthModule,
    RedisModule,
    CourseModule,
    UserCourseModule,
    RefreshTokenModule,
    ProblemsModule,
    ContestsModule,
    forwardRef(() => SubmissionModule),
  ],
  controllers: [LtiController],
  providers: [
    LtiService,
    LtiUtilService,
    KeysService,
    AgsService,
    DefaultDeepLinkingStrategy,
    DeepLinkingFactory,
    ContestContentStrategy,
    ProblemManagementContentStrategy,
    DeepLinkingContentStrategyFactory,
    ResourceUrlFactory,
    ContestResourceUrlBuilder,
    ProblemManagementUrlBuilder,
    {
      provide: RESOURCE_URL_BUILDER,
      useFactory: (
        contestBuilder: ContestResourceUrlBuilder,
        problemManagementBuilder: ProblemManagementUrlBuilder,
      ) => [contestBuilder, problemManagementBuilder],
      inject: [ContestResourceUrlBuilder, ProblemManagementUrlBuilder],
    },
  ],
  exports: [AgsService],
})
export class LtiModule {}
