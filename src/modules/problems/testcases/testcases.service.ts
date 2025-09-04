import { Injectable } from '@nestjs/common';
import { UpdateTestcaseDto } from './dto/update-testcase.dto';
import { StoragesService } from 'src/modules/storages/storages.service';
import {
  TESTCASE_BUCKET,
  TESTCASE_FILE_EXTENSION,
} from './constants/testcases.constant';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { v4 as uuidV4 } from 'uuid';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Testcase } from './entities/testcase.entity';

@Injectable()
export class TestcasesService {
  constructor(
    private readonly storagesService: StoragesService,
    @InjectRepository(Testcase)
    private readonly testcaseRepository: Repository<Testcase>,
  ) {}

  async create(file: Express.Multer.File, user: JwtPayload) {
    const seed = uuidV4();
    const key = `${user.userId}_${user.iss}_${seed}.${TESTCASE_FILE_EXTENSION}`;

    await this.storagesService.upload({
      bucket: TESTCASE_BUCKET,
      key,
      file: file.buffer,
    });

    const url = this.storagesService.getObjectUrl(TESTCASE_BUCKET, key);

    await this.testcaseRepository.save({
      fileUrl: url,
    });
  }

  findAll() {
    return `This action returns all testcases`;
  }

  findOne(id: number) {
    return `This action returns a #${id} testcase`;
  }

  update(id: number, updateTestcaseDto: UpdateTestcaseDto) {
    return `This action updates a #${id} testcase`;
  }

  remove(id: number) {
    return `This action removes a #${id} testcase`;
  }
}
