// NestJS
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared/Common
import { PaginationModule } from 'src/common/pagination/pagination.module';

// Relative imports
import { ProblemsModule } from '../problems/problems.module';
import { Submission } from '../submission/entities/submission.entity';
import { SubmissionModule } from '../submission/submission.module';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { Contest } from './entities/contest.entity';
import { ContestParticipation } from './entities/contest-participations.entity';
import { ContestProblemResult } from './entities/contest-problem-result.entity';
import { ContestProblem } from './entities/contest-problem.entity';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';
import { ContestParticipationService } from './services/contest-participation.service';
import { ContestProblemsService } from './services/contest-problems.service';
import { LeaderboardPaginationService } from './services/leaderboard-pagination.service';
import { SubmissionsOverviewPaginationService } from './services/submissions-overview-pagination.service';
import { StudentContestListStrategy } from './strategies/student-contest-list.strategy';
import { TeacherContestListStrategy } from './strategies/teacher-contest-list.strategy';

@Module({
  controllers: [ContestsController],
  providers: [
    ContestsService,
    ContestParticipationService,
    ContestProblemsService,
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
      ContestProblem,
      ContestProblemResult,
      Submission,
    ]),
    ProblemsModule,
    PaginationModule,
    forwardRef(() => SubmissionModule),
  ],
  exports: [ContestsService, ContestParticipationService],
})
export class ContestsModule {}
