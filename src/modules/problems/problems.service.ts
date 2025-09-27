import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsSelect, In, Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { Problem } from './entities/problem.entity';
import { Tag } from './tags/entities/tag.entity';
import { Testcase } from './testcases/entities/testcase.entity';
import { Topic } from './topics/entities/topic.entity';

@Injectable()
export class ProblemsService {
  private readonly logger = new Logger(ProblemsService.name);

  constructor(
    @InjectRepository(Problem)
    private readonly problemsRepository: Repository<Problem>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProblemDto: CreateProblemDto, user: JwtPayload) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tags = await queryRunner.manager.find(Tag, {
        where: { id: In(createProblemDto.tags) },
        select: ['id'],
      });
      if (tags.length !== createProblemDto.tags.length) {
        throw new BadRequestException('Some tags are invalid');
      }

      const topics = await queryRunner.manager.find(Topic, {
        where: { id: In(createProblemDto.topics) },
        select: ['id'],
      });
      if (topics.length !== createProblemDto.topics.length) {
        throw new BadRequestException('Some topics are invalid');
      }

      const testcase = await queryRunner.manager.findOneOrFail(Testcase, {
        where: { id: createProblemDto.testcase },
        select: ['id'],
      });

      const problem = queryRunner.manager.create(Problem, {
        ...createProblemDto,
        author: { id: user.userId },
        testcase,
        courseProblems: [{ course: { id: user.courseId } }],
        problemTags: tags.map((tag) => ({ tag })),
        problemTopics: topics.map((topic) => ({ topic })),
      });

      await queryRunner.manager.save(Problem, problem);
      await queryRunner.commitTransaction();

      return problem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.problemsRepository.find();
  }

  async findById(id: string, select?: FindOptionsSelect<Problem>) {
    return await this.problemsRepository.findOne({ where: { id }, select });
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    await this.problemsRepository.update(id, {
      ...updateProblemDto,
      problemTags: updateProblemDto.tags?.map((tagId) => ({
        tag: { id: tagId },
      })),
      problemTopics: updateProblemDto.topics?.map((topicId) => ({
        topic: { id: topicId },
      })),
      testcase: updateProblemDto.testcase
        ? { id: updateProblemDto.testcase }
        : undefined,
    });
  }

  async remove(id: string) {
    await this.problemsRepository.delete(id);
  }
}
