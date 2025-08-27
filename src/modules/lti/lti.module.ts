import { Module } from '@nestjs/common';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';
import { KeysService } from './keys.service';

@Module({
  controllers: [LtiController],
  providers: [LtiService, KeysService],
})
export class LtiModule {}
