// NestJS
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Relative imports
import { StoragesModule } from 'src/modules/storages/storages.module';
import { TestcaseSample } from './entities/testcase-sample.entity';
import { Testcase } from './entities/testcase.entity';
import { TestcaseTransformService } from './helpers/testcase-transform.service';
import { TestcaseValidationService } from './helpers/testcase-validation.service';
import { TestcasesService } from './testcases.service';

@Module({
  providers: [
    TestcasesService,
    TestcaseValidationService,
    TestcaseTransformService,
  ],
  imports: [
    TypeOrmModule.forFeature([Testcase, TestcaseSample]),
    StoragesModule,
  ],
  exports: [TestcasesService],
})
export class TestcasesModule {}
