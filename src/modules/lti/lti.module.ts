import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { RefreshTokenModule } from '../../modules/auth/refresh-token.module';
import { UserModule } from '../../modules/user/user.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { ContestsModule } from '../contests/contests.module';
import { CourseModule } from '../course/course.module';
import { ProblemsModule } from '../problems/problems.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { KeysService } from './keys.service';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';

@Module({
  imports: [
    UserModule,
    AuthModule,
    RedisModule,
    CourseModule,
    UserCourseModule,
    RefreshTokenModule,
    ProblemsModule,
    ContestsModule,
  ],
  controllers: [LtiController],
  providers: [LtiService, KeysService],
})
export class LtiModule {}
