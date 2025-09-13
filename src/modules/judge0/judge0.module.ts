import { Module } from '@nestjs/common';
import { Judge0Service } from './judge0.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [Judge0Service],
  exports: [Judge0Service],
})
export class Judge0Module {}
