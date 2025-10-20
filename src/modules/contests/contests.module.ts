import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemsModule } from '../problems/problems.module';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { Contest } from './entities/contest.entity';
import { ContestProblem } from './entities/contest-problem.entity';

@Module({
  controllers: [ContestsController],
  providers: [ContestsService],
  imports: [
    TypeOrmModule.forFeature([Contest, ContestProblem]),
    ProblemsModule,
  ],
  exports: [ContestsService],
})
export class ContestsModule {}
