import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { StoragesService } from '../storages/storages.service';
import { Submission } from '../submission/entities/submission.entity';
import { RoleEnum } from '../user/enums/role.enum';
import { UserService } from '../user/user.service';
import { ProblemTag } from './entities/problem-tag.entity';
import { ProblemTopic } from './entities/problem-topic.entity';
import { Problem } from './entities/problem.entity';
import { ProblemsService } from './problems.service';
import { ProblemFactory } from './services/problem-factory.service';
import { ProblemStatisticsService } from './services/problem-statistics.service';
import { ProblemValidationService } from './services/problem-validation.service';
import { ContestProblemFilterStrategy } from './strategies/contest-problem-filter.strategy';
import { StudentProblemFilterStrategy } from './strategies/student-problem-filter.strategy';
import { TeacherProblemFilterStrategy } from './strategies/teacher-problem-filter.strategy';
import { TagsService } from './tags/tags.service';
import { TestcasesService } from './testcases/testcases.service';
import { TopicsService } from './topics/topics.service';

describe('ProblemsService', () => {
  let service: ProblemsService;
  let problemsRepository: Repository<Problem>;

  const mockProblemRepository = {
    createQueryBuilder: jest.fn(),
  };
  const mockUserService = {
    findOne: jest.fn(),
  };
  const mockTagsService = {
    find: jest.fn(),
  };
  const mockTopicsService = {
    find: jest.fn(),
  };
  const mockTestcasesService = {
    findTestcaseOne: jest.fn(),
    findTestcaseSamples: jest.fn(),
  };
  const mockStatisticsService = {
    getQuickStatistics: jest.fn(),
  };
  const mockStorageService = {
    getPresignedUrl: jest.fn(),
  };

  const mockUser: JwtPayload = {
    userId: 1,
    courseId: 1,
    roles: [RoleEnum.INSTRUCTOR],
    sub: '',
    iss: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProblemsService,
        {
          provide: getRepositoryToken(Problem),
          useValue: mockProblemRepository,
        },
        { provide: getRepositoryToken(ProblemTag), useValue: {} },
        { provide: getRepositoryToken(ProblemTopic), useValue: {} },
        {
          provide: getRepositoryToken(Submission),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              getRawOne: jest
                .fn()
                .mockResolvedValue({ attemptedUsers: 1, solvedUsers: 1 }),
            })),
          },
        },
        { provide: TagsService, useValue: mockTagsService },
        { provide: TopicsService, useValue: mockTopicsService },
        { provide: TestcasesService, useValue: mockTestcasesService },
        { provide: UserService, useValue: mockUserService },
        { provide: StoragesService, useValue: mockStorageService },
        { provide: ProblemStatisticsService, useValue: mockStatisticsService },
        { provide: ProblemValidationService, useValue: {} },
        { provide: ProblemFactory, useValue: {} },
        { provide: StudentProblemFilterStrategy, useValue: {} },
        { provide: ContestProblemFilterStrategy, useValue: {} },
        { provide: TeacherProblemFilterStrategy, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProblemsService>(ProblemsService);
    problemsRepository = module.get<Repository<Problem>>(
      getRepositoryToken(Problem),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDetailProblemForInstructor', () => {
    const problemId = 1;
    const problem = { id: problemId, authorId: 1 };
    const author = { id: 1, firstName: 'John', lastName: 'Doe' };
    const tags = [{ id: 1, name: 'tag1' }];
    const topics = [{ id: 1, name: 'topic1' }];
    const testcase = { id: 1, fileUrl: 'url' };
    const testcaseSamples = [{ id: 1, input: 'in', output: 'out' }];
    const quickStats = { total: 10, accepted: 5, rate: 0.5 };

    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    it('should return problem details for instructor', async () => {
      (problemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(problem);
      mockUserService.findOne.mockResolvedValue(author);
      mockTagsService.find.mockResolvedValue(tags);
      mockTopicsService.find.mockResolvedValue(topics);
      mockTestcasesService.findTestcaseOne.mockResolvedValue(testcase);
      mockTestcasesService.findTestcaseSamples.mockResolvedValue(
        testcaseSamples,
      );
      mockStatisticsService.getQuickStatistics.mockResolvedValue(quickStats);
      mockStorageService.getPresignedUrl.mockResolvedValue(testcase.fileUrl);

      const result = await service.getDetailProblemForInstructor(
        problemId,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.author).toEqual(author);
    });

    it('should throw ForbiddenException if problem not found', async () => {
      (problemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.getDetailProblemForInstructor(problemId, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if author not found', async () => {
      (problemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(problem);
      mockUserService.findOne.mockResolvedValue(null);

      await expect(
        service.getDetailProblemForInstructor(problemId, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if testcase not found', async () => {
      (problemsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(problem);
      mockUserService.findOne.mockResolvedValue(author);
      mockTagsService.find.mockResolvedValue(tags);
      mockTopicsService.find.mockResolvedValue(topics);
      mockTestcasesService.findTestcaseOne.mockResolvedValue(null);

      await expect(
        service.getDetailProblemForInstructor(problemId, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
