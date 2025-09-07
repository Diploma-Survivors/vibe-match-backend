import { Module } from '@nestjs/common';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';
import { KeysService } from './keys.service';
import { UserModule } from '../../modules/user/user.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { UserCourseModule } from '../user-course/user-course.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    RedisModule,
    CourseModule,
    UserCourseModule,
  ],
  controllers: [LtiController],
  providers: [LtiService, KeysService],
})
export class LtiModule {}
