import { Module } from '@nestjs/common';
import { TestcasesService } from './testcases.service';
import { TestcasesController } from './testcases.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Testcase } from './entities/testcase.entity';

@Module({
  controllers: [TestcasesController],
  providers: [TestcasesService],
  imports: [TypeOrmModule.forFeature([Testcase])],
})
export class TestcasesModule {}
