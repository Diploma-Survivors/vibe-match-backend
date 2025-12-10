// Built-in
import { unlink } from 'node:fs/promises';

// NestJS
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { FindOneOptions, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { v4 as uuidV4 } from 'uuid';

// Relative imports
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { StoragesService } from 'src/modules/storages/storages.service';
import { TESTCASE_FILE_EXTENSION } from './constants/testcases.constant';
import { TestcaseSample } from './entities/testcase-sample.entity';
import { Testcase } from './entities/testcase.entity';
import { TestcaseTransformService } from './helpers/testcase-transform.service';
import { TestcaseValidationService } from './helpers/testcase-validation.service';

@Injectable()
export class TestcasesService {
  private readonly logger = new Logger(TestcasesService.name);

  constructor(
    @InjectRepository(Testcase)
    private readonly testcaseRepository: Repository<Testcase>,
    @InjectRepository(TestcaseSample)
    private readonly testcaseSampleRepository: Repository<TestcaseSample>,
    private readonly storagesService: StoragesService,
    private readonly configService: ConfigService,
    private readonly validationService: TestcaseValidationService,
    private readonly transformService: TestcaseTransformService,
  ) {}

  async uploadAndSaveFileTestcase(
    file: Express.Multer.File,
    user: JwtPayload,
    problemId: number,
    keyS3?: string,
  ) {
    const filePath = file.path;
    const bucket = this.configService.get<string>(
      'aws.s3.bucketName',
    ) as string;
    let uploadedS3Key: string | undefined = undefined;

    try {
      const validationResult =
        await this.validationService.validateTestcaseFile(filePath);

      if (!validationResult.isValid) {
        const errorMessage =
          this.validationService.formatValidationErrors(validationResult);
        throw new BadRequestException({
          message: 'Testcase validation failed',
          errors: validationResult.errors,
          summary: errorMessage,
        });
      }

      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.logger.warn(
          `Validation warnings:\n${validationResult.warnings.join('\n')}`,
        );
      }

      const seed = uuidV4();
      const key =
        keyS3 ??
        `${seed}_${user.userId}_${user.courseId}${TESTCASE_FILE_EXTENSION}`;

      const transformStream =
        this.transformService.createTransformStream(filePath);

      await this.storagesService.uploadStream(
        bucket,
        key,
        transformStream,
        'application/x-ndjson',
        (progress) => {
          this.logger.debug(
            `Upload progress: ${progress.percent}% (${progress.loaded} bytes)`,
          );
        },
      );
      uploadedS3Key = key;

      // File exists, update record
      if (keyS3) {
        await this.testcaseRepository.update(
          { problemId },
          { keyS3: key, testcaseCount: validationResult.testcaseCount },
        );
      } else {
        await this.testcaseRepository.save({
          keyS3: key,
          problemId,
          testcaseCount: validationResult.testcaseCount,
        });
      }

      await this.cleanupTempFile(filePath);

      return {
        key,
        testcaseCount: validationResult.testcaseCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      this.logger.error(`Testcase processing failed: ${message}`);
      await this.cleanupTempFile(filePath);
      if (uploadedS3Key) {
        await this.storagesService.delete(bucket, uploadedS3Key);
      }
      throw error;
    }
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    await unlink(filePath);
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

  async deleteExtraTestcaseSamples(problemId: number, testcaseIds: number[]) {
    await this.testcaseSampleRepository.delete({
      problemId,
      id: Not(In(testcaseIds)),
    });
  }
}
