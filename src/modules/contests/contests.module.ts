import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { ContestProblem } from './entities/contest-problem.entity';
import { Contest } from './entities/contest.entity';

@Module({
  controllers: [ContestsController],
  providers: [ContestsService],
  imports: [TypeOrmModule.forFeature([Contest, ContestProblem])],
  exports: [ContestsService],
})
export class ContestsModule {}
