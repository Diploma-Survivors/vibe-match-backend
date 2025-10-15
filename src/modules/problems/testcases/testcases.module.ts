import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoragesModule } from 'src/modules/storages/storages.module';
import { Testcase } from './entities/testcase.entity';
import { TestcasesService } from './testcases.service';

@Module({
  providers: [TestcasesService],
  imports: [TypeOrmModule.forFeature([Testcase]), StoragesModule],
  exports: [TestcasesService],
})
export class TestcasesModule {}
