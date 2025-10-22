import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { StoragesService } from 'src/modules/storages/storages.service';
import { FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { v4 as uuidV4 } from 'uuid';
import { TESTCASE_FILE_EXTENSION } from './constants/testcases.constant';
import { TestcaseSample } from './entities/testcase-sample.entity';
import { Testcase } from './entities/testcase.entity';

@Injectable()
export class TestcasesService {
  constructor(
    @InjectRepository(Testcase)
    private readonly testcaseRepository: Repository<Testcase>,
    @InjectRepository(TestcaseSample)
    private readonly testcaseSampleRepository: Repository<TestcaseSample>,
    private readonly storagesService: StoragesService,
    private readonly configService: ConfigService,
  ) {}

  async uploadAndSaveFileTestcase(
    file: Express.Multer.File,
    user: JwtPayload,
    problemId: number,
    keyS3?: string,
  ) {
    const seed = uuidV4();
    const key =
      keyS3 ??
      `${seed}_${user.userId}_${user.courseId}${TESTCASE_FILE_EXTENSION}`;
    const bucket = this.configService.get<string>(
      'aws.s3.bucketName',
    ) as string;

    await this.storagesService.upload({
      bucket,
      key,
      file: file.buffer,
    });

    const url = this.storagesService.getObjectUrl(bucket, key);

    // File exists, update record
    if (keyS3) {
      await this.testcaseRepository.update({ problemId }, { fileUrl: url });
      return;
    }

    const testcase = await this.testcaseRepository.save({
      fileUrl: url,
      problemId,
    });
    return testcase;
  }

  async findTestcaseOne(
    options: FindOneOptions<Testcase>,
  ): Promise<Testcase | null> {
    return this.testcaseRepository.findOne(options);
  }

  async findTestcaseSamples(options: FindOneOptions<TestcaseSample>) {
    return this.testcaseSampleRepository.find(options);
  }

  async updateTestcaseSample(
    where: FindOptionsWhere<TestcaseSample>,
    updateData: QueryDeepPartialEntity<TestcaseSample>,
  ): Promise<void> {
    await this.testcaseSampleRepository.update(where, updateData);
  }

  async createTestcaseSample(data: Partial<TestcaseSample>) {
    const testcaseSample = this.testcaseSampleRepository.create(data);
    return this.testcaseSampleRepository.save(testcaseSample);
  }
}
