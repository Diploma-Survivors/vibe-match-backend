import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { ProblemsService } from '../problems/problems.service';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestsService } from './contests.service';
import { Contest } from './entities/contest.entity';
import { DeadlineEnforcement } from './enums/deadline-enforcement.enum';
import { ContestFilterStrategyFactory } from './services/contest-filter-strategy.factory';

jest.mock('typeorm-transactional', () => ({
  initializeTransactionalContext: jest.fn(),
  patchTypeORMRepositoryWithBaseRepository: jest.fn(),
  addTransactionalDataSource: jest.fn(),
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: MethodDecorator) =>
      descriptor,
}));

describe('ContestsService', () => {
  let service: ContestsService;

  const mockContestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockProblemsService = {
    getQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockContestFilterStrategyFactory = {
    getStrategy: jest.fn(),
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
        ContestsService,
        {
          provide: getRepositoryToken(Contest),
          useValue: mockContestRepository,
        },
        {
          provide: ProblemsService,
          useValue: mockProblemsService,
        },
        {
          provide: ContestFilterStrategyFactory,
          useValue: mockContestFilterStrategyFactory,
        },
      ],
    }).compile();

    service = module.get<ContestsService>(ContestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContest', () => {
    const createContestDto = {
      name: 'Test Contest',
      description: 'Test Description',
      startTime: new Date(),
      endTime: new Date(),
      problems: [{ id: 1, score: 10 }],
      deadlineEnforcement: DeadlineEnforcement.STRICT,
    };

    it('should create a contest successfully', async () => {
      const problems = [{ id: 1 }];
      const contest = new Contest();
      mockQueryBuilder.getRawMany.mockResolvedValue(problems);
      mockContestRepository.create.mockReturnValue(contest);
      mockContestRepository.save.mockResolvedValue(contest);

      const result = await service.createContest(createContestDto, mockUser);

      expect(result).toEqual(contest);
    });

    it('should throw BadRequestException if problem not found', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      await expect(
        service.createContest(createContestDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateContestDto = {
      title: 'Updated Contest',
      problems: [{ id: 1, score: 20 }],
    };
    const contestId = 1;

    it('should update a contest successfully', async () => {
      const contest = new Contest();
      contest.authorId = mockUser.userId;
      contest.courseId = mockUser.courseId!;
      const problems = [{ id: 1 }];

      mockContestRepository.findOne.mockResolvedValue(contest);
      mockQueryBuilder.getRawMany.mockResolvedValue(problems);
      mockContestRepository.save.mockResolvedValue(contest);

      jest.spyOn(service, 'getDetailContest').mockResolvedValue(
        contest as Omit<Contest, 'contestProblems'> & {
          contestProblems: [];
        },
      );
      mockContestRepository.createQueryBuilder.mockReturnValue({
        relation: jest.fn().mockReturnThis(),
        of: jest.fn().mockReturnThis(),
        addAndRemove: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.update(
        contestId,
        updateContestDto,
        mockUser,
      );
      expect(result).toEqual(contest);
    });

    it('should throw a ForbiddenException if the user is not authorized to update the contest', async () => {
      const contest = new Contest();
      contest.authorId = 2;
      contest.courseId = 2;
      mockContestRepository.findOne.mockResolvedValue(contest);

      await expect(
        service.update(contestId, updateContestDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDetailContest', () => {
    const contestId = 1;

    it('should get detail of a contest', async () => {
      const contest = new Contest();
      contest.courseId = mockUser.courseId!;
      contest.contestProblems = [];
      mockContestRepository.findOne.mockResolvedValue(contest);

      const result = await service.getDetailContest(contestId, mockUser);
      expect(result).toEqual(contest);
    });

    it('should throw a ForbiddenException if the user is not authorized to access the contest', async () => {
      const contest = new Contest();
      contest.courseId = 2;
      mockContestRepository.findOne.mockResolvedValue(contest);

      await expect(
        service.getDetailContest(contestId, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
