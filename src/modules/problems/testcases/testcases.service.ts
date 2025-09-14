import { Injectable } from '@nestjs/common';
import { UpdateTestcaseDto } from './dto/update-testcase.dto';
import { StoragesService } from 'src/modules/storages/storages.service';
import { TESTCASE_FILE_EXTENSION } from './constants/testcases.constant';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { v4 as uuidV4 } from 'uuid';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Testcase } from './entities/testcase.entity';
import { ConfigService } from '@nestjs/config';

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

  findAll() {
    return `This action returns all testcases`;
  }

  findOne(id: string) {
    return `This action returns a #${id} testcase`;
  }

  update(id: string, updateTestcaseDto: UpdateTestcaseDto) {
    return `This action updates a #${id} testcase with dto ${updateTestcaseDto.fileUrl}`;
  }

  remove(id: string) {
    return `This action removes a #${id} testcase`;
  }
}
