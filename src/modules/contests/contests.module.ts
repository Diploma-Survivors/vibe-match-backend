// NestJS
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared/Common
import { PaginationModule } from 'src/common/pagination/pagination.module';

// Relative imports
import { ProblemsModule } from '../problems/problems.module';
import { Submission } from '../submission/entities/submission.entity';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { Contest } from './entities/contest.entity';
import { ContestParticipation } from './entities/contest-participations.entity';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';
import { LeaderboardPaginationService } from './services/leaderboard-pagination.service';
import { SubmissionsOverviewPaginationService } from './services/submissions-overview-pagination.service';
import { StudentContestListStrategy } from './strategies/student-contest-list.strategy';
import { TeacherContestListStrategy } from './strategies/teacher-contest-list.strategy';
import { ContestProblem } from './entities/contest-problem.entity';

@Module({
  controllers: [ContestsController],
  providers: [
    ContestsService,
    TeacherContestListStrategy,
    StudentContestListStrategy,
    ContestFilterStrategyFactory,
    LeaderboardPaginationService,
    SubmissionsOverviewPaginationService,
  ],
  imports: [
    TypeOrmModule.forFeature([
      Contest,
      ContestParticipation,
      Submission,
      ContestProblem,
    ]),
    ProblemsModule,
    PaginationModule,
  ],
  exports: [ContestsService],
})
export class ContestsModule {}
