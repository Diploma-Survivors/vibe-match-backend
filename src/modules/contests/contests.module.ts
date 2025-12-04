// NestJS
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared/Common
import { PaginationModule } from 'src/common/pagination/pagination.module';

// Relative imports
import { ProblemsModule } from '../problems/problems.module';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { ContestProblem } from './entities/contest-problem.entity';
import { Contest } from './entities/contest.entity';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';
import { StudentContestListStrategy } from './strategies/student-contest-list.strategy';
import { TeacherContestListStrategy } from './strategies/teacher-contest-list.strategy';

@Module({
  controllers: [ContestsController],
  providers: [
    ContestsService,
    TeacherContestListStrategy,
    StudentContestListStrategy,
    ContestFilterStrategyFactory,
  ],
  imports: [
    TypeOrmModule.forFeature([Contest, ContestProblem]),
    ProblemsModule,
    PaginationModule,
  ],
  exports: [ContestsService],
})
export class ContestsModule {}
