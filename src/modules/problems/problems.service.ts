// NestJS
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import { FindOptionsSelect, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { SelectQueryBuilder } from 'typeorm/browser';

// Relative imports
import { StoragesService } from '../storages/storages.service';
import { Submission } from '../submission/entities/submission.entity';
import { SubmissionStatus } from '../submission/enums/submission-status.enum';
import { UserService } from '../user/user.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { ProblemsCursorQueryDto } from './dto/problems-cursor-query.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemTag } from './entities/problem-tag.entity';
import { ProblemTopic } from './entities/problem-topic.entity';
import { Problem } from './entities/problem.entity';
import { ProblemType } from './enums/problem-type.enum';
import { ProblemVisibility } from './enums/problem-visibility.enum';
import { ProblemFactory } from './services/problem-factory.service';
import { ProblemStatisticsService } from './services/problem-statistics.service';
import { ProblemValidationService } from './services/problem-validation.service';
import { ContestProblemFilterStrategy } from './strategies/contest-problem-filter.strategy';
import { StudentProblemFilterStrategy } from './strategies/student-problem-filter.strategy';
import { TeacherProblemFilterStrategy } from './strategies/teacher-problem-filter.strategy';
import { TagsService } from './tags/tags.service';
import { TestcasesService } from './testcases/testcases.service';
import { TopicsService } from './topics/topics.service';

// Type imports
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../auth/interfaces/jwt.interface';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectRepository(Problem)
    private readonly problemsRepository: Repository<Problem>,
    @InjectRepository(ProblemTag)
    private readonly problemTagsRepository: Repository<ProblemTag>,
    @InjectRepository(ProblemTopic)
    private readonly problemTopicsRepository: Repository<ProblemTopic>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    private readonly tagsService: TagsService,
    private readonly topicsService: TopicsService,
    private readonly testcasesService: TestcasesService,
    private readonly userService: UserService,
    private readonly storagesService: StoragesService,
    private readonly statisticsService: ProblemStatisticsService,
    private readonly validationService: ProblemValidationService,
    private readonly problemFactory: ProblemFactory,
    private readonly studentProblemStrategy: StudentProblemFilterStrategy,
    private readonly contestCreationProblemStrategy: ContestProblemFilterStrategy,
    private readonly teacherProblemStrategy: TeacherProblemFilterStrategy,
    private readonly configService: ConfigService,
  ) {}

  getQueryBuilder(): SelectQueryBuilder<Problem> {
    return this.problemsRepository.createQueryBuilder('problem');
  }

  async getDetailProblemForInstructor(id: number, currentUser: JwtPayload) {
    const queryBuilder = this.getQueryBuilder();

    const problem = await queryBuilder
      .innerJoin('problem.courseProblems', 'courseProblem')
      .where('problem.id = :id', { id })
      .andWhere('courseProblem.courseId = :courseId', {
        courseId: currentUser.courseId,
      })
      .select(['problem'])
      .distinct(true)
      .getOne();

    if (!problem) {
      throw new ForbiddenException('You do not have access to this problem');
    }

    const author = await this.userService.findOne({
      where: { id: problem.authorId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!author) {
      throw new BadRequestException('Author not found');
    }

    const [tags, topics, testcase, testcaseSamples, quickStats] =
      await Promise.all([
        this.tagsService.find({
          where: { problemTags: { problemId: problem.id } },
          select: ['id', 'name'],
        }),
        this.topicsService.find({
          where: { problemTopics: { problemId: problem.id } },
          select: ['id', 'name'],
        }),
        this.testcasesService.findTestcaseOne({
          where: { problemId: problem.id },
          select: ['id', 'keyS3'],
        }),
        this.testcasesService.findTestcaseSamples({
          where: { problemId: problem.id },
          select: ['id', 'input', 'output'],
        }),
        this.getStatisticsByProblemId(id),
      ]);

    if (!testcase) {
      throw new BadRequestException('Testcase not found');
    }

    const bucket = this.configService.get<string>(
      'aws.s3.bucketName',
    ) as string;
    const keyS3 = testcase.keyS3;

    const detailProblem = {
      ...problem,
      author,
      tags,
      topics,
      testcase: {
        id: testcase.id,
        fileUrl: await this.storagesService.getPresignedUrl(bucket, keyS3),
      },
      testcaseSamples,
      quickStats,
    };

    return detailProblem;
  }

  @Transactional()
  async create(
    createProblemDto: CreateProblemDto,
    user: JwtPayload,
    testcaseFile: Express.Multer.File,
  ) {
    const { tags, topics } =
      await this.validationService.validateProblemData(createProblemDto);

    const problemData = this.problemFactory.createProblem(
      createProblemDto,
      user,
      tags,
      topics,
    );

    const problem = this.problemsRepository.create(problemData);
    const problemSaved = await this.problemsRepository.save(problem);

    await this.testcasesService.uploadAndSaveFileTestcase(
      testcaseFile,
      user,
      problemSaved.id,
    );

    return problemSaved;
  }

  async findProblemsByStudent(
    query: ProblemsCursorQueryDto,
    currentUser: JwtPayload,
  ) {
    query.filters = {
      ...query.filters,
      type: ProblemType.STANDALONE,
      courseId: currentUser.courseId,
      visibility: ProblemVisibility.PUBLIC,
      authorId: undefined,
    };

    return this.studentProblemStrategy.findWithCursorPagination(query);
  }

  async findProblemsForContestCreation(
    query: ProblemsCursorQueryDto,
    currentUser: JwtPayload,
  ) {
    query.filters = {
      ...query.filters,
      type: ProblemType.CONTEST,
      authorId: currentUser.userId,
      visibility: ProblemVisibility.PUBLIC,
      courseId: currentUser.courseId,
    };

    return this.contestCreationProblemStrategy.findWithCursorPagination(query);
  }

  async findProblemsForManagement(
    query: ProblemsCursorQueryDto,
    currentUser: JwtPayload,
  ) {
    query.filters = {
      ...query.filters,
      authorId: currentUser.userId,
      courseId: currentUser.courseId,
    };

    return this.teacherProblemStrategy.findWithCursorPagination(query);
  }

  async findById(id: number, select?: FindOptionsSelect<Problem>) {
    return await this.problemsRepository.findOne({ where: { id }, select });
  }

  async findDetailProblemById(id: number, currentUser: JwtPayload) {
    const problem = await this.problemsRepository.findOne({
      where: { id },
      relations: ['testcaseSamples', 'courseProblems'],
    });
    if (!problem) {
      throw new BadRequestException('Problem not found');
    }

    const isAccessible = problem.courseProblems.some(
      (cp) => cp.courseId === currentUser.courseId,
    );

    if (!isAccessible) {
      throw new ForbiddenException('You do not have access to this problem');
    }

    return problem;
  }

  @Transactional()
  async updateById(
    id: number,
    updateProblemDto: UpdateProblemDto,
    currentUser: JwtPayload,
    testcaseFile?: Express.Multer.File,
  ) {
    const problem = await this.findById(id, {
      id: true,
      authorId: true,
    });
    if (!problem || !(problem.authorId === currentUser.userId)) {
      throw new ForbiddenException('You do not have access to this problem');
    }

    const { tags, topics, testcaseSamples, ...restDto } = updateProblemDto;

    await this.problemsRepository.update(id, {
      ...restDto,
      testcase: undefined,
    });

    if (tags) {
      const existingTags = await this.problemTagsRepository.find({
        where: { problemId: id },
      });
      const toDeleteTags = existingTags.filter((t) => !tags.includes(t.tagId));
      const toAddTags = tags.filter(
        (tagId) => !existingTags.some((t) => t.tagId === tagId),
      );

      if (toDeleteTags.length > 0) {
        await this.problemTagsRepository.delete(toDeleteTags);
      }

      if (toAddTags.length > 0) {
        const newProblemTags = toAddTags.map((tagId) =>
          this.problemTagsRepository.create({ problemId: id, tagId }),
        );
        await this.problemTagsRepository.save(newProblemTags);
      }
    }

    if (topics) {
      const existingTopics = await this.problemTopicsRepository.find({
        where: { problemId: id },
      });
      const toDeleteTopics = existingTopics.filter(
        (t) => !topics.includes(t.topicId),
      );
      const toAddTopics = topics.filter(
        (topicId) => !existingTopics.some((t) => t.topicId === topicId),
      );

      if (toDeleteTopics.length > 0) {
        await this.problemTopicsRepository.delete(toDeleteTopics);
      }

      if (toAddTopics.length > 0) {
        const newProblemTopics = toAddTopics.map((topicId) =>
          this.problemTopicsRepository.create({ problemId: id, topicId }),
        );
        await this.problemTopicsRepository.save(newProblemTopics);
      }
    }

    if (testcaseSamples) {
      await Promise.all([
        ...testcaseSamples.map(async (sample) => {
          if (sample?.id) {
            await this.testcasesService.updateTestcaseSample(
              { id: sample.id, problemId: id },
              { input: sample.input, output: sample.output },
            );
          } else {
            await this.testcasesService.createTestcaseSample({
              problemId: id,
              input: sample.input,
              output: sample.output,
            });
          }
        }),
        await this.testcasesService.deleteExtraTestcaseSamples(
          id,
          testcaseSamples
            .filter((sample) => sample.id)
            .map((sample) => sample.id as number),
        ),
      ]);
    }

    if (!testcaseFile) {
      return;
    }

    const existingTestcase = await this.testcasesService.findTestcaseOne({
      where: { problemId: id },
      select: ['id', 'keyS3'],
    });
    if (!existingTestcase) {
      throw new BadRequestException('Testcase not found');
    }

    await this.testcasesService.uploadAndSaveFileTestcase(
      testcaseFile,
      currentUser,
      id,
      existingTestcase.keyS3,
    );
  }

  async getStatisticsByProblemId(problemId: number) {
    const stats = await this.statisticsService.getQuickStatistics(problemId);

    const { attemptedUsers } = (await this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.problemId = :problemId', { problemId })
      .select('COUNT(DISTINCT submission.userId)', 'attemptedUsers')
      .getRawOne()) as { attemptedUsers: number };

    const { solvedUsers } = (await this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.problemId = :problemId', { problemId })
      .andWhere('submission.status = :status', {
        status: SubmissionStatus.ACCEPTED,
      })
      .select('COUNT(DISTINCT submission.userId)', 'solvedUsers')
      .getRawOne()) as { solvedUsers: number };

    const averageAttempts = attemptedUsers ? stats.total / attemptedUsers : 0;

    return {
      totalSubmissions: stats.total,
      totalAcceptedSubmissions: stats.accepted,
      acceptanceRate: stats.rate,
      attemptedUsers,
      solvedUsers,
      averageAttempts,
    };
  }

  async remove(id: string) {
    await this.problemsRepository.delete(id);
  }
}
