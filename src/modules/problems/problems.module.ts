import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoragesModule } from '../storages/storages.module';
import { ProblemTag } from './entities/problem-tag.entity';
import { ProblemTopic } from './entities/problem-topic.entity';
import { Problem } from './entities/problem.entity';
import { FileRequiredPipe } from './pipes/file-required.pipe';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';
import { TagsModule } from './tags/tags.module';
import { TestcasesModule } from './testcases/testcases.module';
import { TopicsModule } from './topics/topics.module';
import { TestcaseSample } from './testcases/entities/testcase-sample.entity';

@Module({
  controllers: [ProblemsController],
  providers: [ProblemsService, FileRequiredPipe],
  imports: [
    TopicsModule,
    TagsModule,
    TestcasesModule,
    StoragesModule,
    TypeOrmModule.forFeature([
      Problem,
      ProblemTag,
      ProblemTopic,
      TestcaseSample,
    ]),
  ],
  exports: [ProblemsService],
})
export class ProblemsModule {}
