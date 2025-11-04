// NestJS
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared/Common
import { PaginationModule } from 'src/common/pagination/pagination.module';

// Relative imports
import { StoragesModule } from '../storages/storages.module';
import { Submission } from '../submission/entities/submission.entity';
import { UserModule } from '../user/user.module';
import { CourseProblem } from './entities/course-problem.entity';
import { ProblemTag } from './entities/problem-tag.entity';
import { ProblemTopic } from './entities/problem-topic.entity';
import { Problem } from './entities/problem.entity';
import { FileRequiredPipe } from './pipes/file-required.pipe';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';
import { ProblemFactory } from './services/problem-factory.service';
import { ProblemStatisticsService } from './services/problem-statistics.service';
import { ProblemValidationService } from './services/problem-validation.service';
import { ContestProblemFilterStrategy } from './strategies/contest-problem-filter.strategy';
import { StudentProblemFilterStrategy } from './strategies/student-problem-filter.strategy';
import { TagsModule } from './tags/tags.module';
import { TestcasesModule } from './testcases/testcases.module';
import { TopicsModule } from './topics/topics.module';

@Module({
  controllers: [ProblemsController],
  providers: [
    ProblemsService,
    ProblemStatisticsService,
    ProblemValidationService,
    ProblemFactory,
    StudentProblemFilterStrategy,
    ContestProblemFilterStrategy,
    FileRequiredPipe,
  ],
  imports: [
    TopicsModule,
    TagsModule,
    TestcasesModule,
    UserModule,
    StoragesModule,
    PaginationModule,
    TypeOrmModule.forFeature([
      Problem,
      CourseProblem,
      ProblemTag,
      ProblemTopic,
      Submission,
    ]),
  ],
  exports: [ProblemsService],
})
export class ProblemsModule {}
