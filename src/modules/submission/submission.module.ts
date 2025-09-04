import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { SubmissionRepository } from './repositories/submission.repository';
import { Judge0Service } from '../judge0/judge0.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubmissionRepository])],
  controllers: [SubmissionController],
  providers: [SubmissionService, Judge0Service],
  exports: [SubmissionService],
})
export class SubmissionModule {}
