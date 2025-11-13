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
import { LeaderboardCursorService } from './services/leaderboard-cursor.service';
import { SubmissionsOverviewCursorService } from './services/submissions-overview-cursor.service';
import { StudentContestListStrategy } from './strategies/student-contest-list.strategy';
import { TeacherContestListStrategy } from './strategies/teacher-contest-list.strategy';

@Module({
  controllers: [ContestsController],
  providers: [
    ContestsService,
    TeacherContestListStrategy,
    StudentContestListStrategy,
    ContestFilterStrategyFactory,
    LeaderboardCursorService,
    SubmissionsOverviewCursorService,
  ],
  imports: [
    TypeOrmModule.forFeature([Contest, ContestParticipation, Submission]),
    ProblemsModule,
    PaginationModule,
  ],
  exports: [ContestsService],
})
export class ContestsModule {}
