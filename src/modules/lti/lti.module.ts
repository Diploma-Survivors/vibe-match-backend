import { Module } from '@nestjs/common';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';
import { KeysService } from './keys.service';
import { UserModule } from '../../modules/user/user.module'; // Import UserModule
import { AuthModule } from '../../modules/auth/auth.module'; // Import AuthModule
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [UserModule, AuthModule, RedisModule],
  controllers: [LtiController],
  providers: [LtiService, KeysService],
})
export class LtiModule {}
