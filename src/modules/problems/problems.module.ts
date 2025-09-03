import { Module } from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';
import { TopicsModule } from './topics/topics.module';
import { TagsModule } from './tags/tags.module';
import { TestcasesModule } from './testcases/testcases.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Problem } from './entities/problem.entity';

@Module({
  controllers: [ProblemsController],
  providers: [ProblemsService],
  imports: [
    TopicsModule,
    TagsModule,
    TestcasesModule,
    TypeOrmModule.forFeature([Problem]),
  ],
})
export class ProblemsModule {}
