import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { StoragesService } from 'src/modules/storages/storages.service';
import { Repository } from 'typeorm';
import { v4 as uuidV4 } from 'uuid';
import { TESTCASE_FILE_EXTENSION } from './constants/testcases.constant';
import { Testcase } from './entities/testcase.entity';

@Injectable()
export class TestcasesService {
  constructor(
    private readonly storagesService: StoragesService,
    @InjectRepository(Testcase)
    private readonly testcaseRepository: Repository<Testcase>,
    private readonly configService: ConfigService,
  ) {}

  async create(file: Express.Multer.File, user: JwtPayload) {
    const seed = uuidV4();
    const key = `${seed}_${user.userId}_${user.courseId}${TESTCASE_FILE_EXTENSION}`;
    const bucket = this.configService.get<string>(
      'aws.s3.bucketName',
    ) as string;

    await this.storagesService.upload({
      bucket,
      key,
      file: file.buffer,
    });

    const url = this.storagesService.getObjectUrl(bucket, key);

    const testcase = await this.testcaseRepository.save({
      fileUrl: url,
    });
    return testcase;
  }
}
