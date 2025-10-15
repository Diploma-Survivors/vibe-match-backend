import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Problem } from './entities/problem.entity';
import { FileRequiredPipe } from './pipes/file-required.pipe';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';
import { TagsModule } from './tags/tags.module';
import { TestcasesModule } from './testcases/testcases.module';
import { TopicsModule } from './topics/topics.module';

@Module({
  controllers: [ProblemsController],
  providers: [ProblemsService, FileRequiredPipe],
  imports: [
    TopicsModule,
    TagsModule,
    TestcasesModule,
    TypeOrmModule.forFeature([Problem]),
  ],
  exports: [ProblemsService],
})
export class ProblemsModule {}
