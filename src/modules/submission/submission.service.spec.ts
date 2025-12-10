import { HttpException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { REDIS } from '../../shared/redis/redis.module';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { ContestParticipation } from '../contests/entities/contest-participations.entity';
import { Contest } from '../contests/entities/contest.entity';
import { Judge0Service } from '../judge0/judge0.service';
import { Language } from '../language/entities/language.entity';
import { Problem } from '../problems/entities/problem.entity';
import { StoragesService } from '../storages/storages.service';
import { User } from '../user/entities/user.entity';
import { RoleEnum } from '../user/enums/role.enum';
import { Submission } from './entities/submission.entity';
import { TestcaseParserUtil } from './helpers/parse-test-file-util';
import { RedisKeys } from './helpers/redis-keys.helper';
import { SubmissionCursorService } from './helpers/submission-cursor.service';
import { GradingStrategyService } from './strategies/grading-strategy.service';
import { SubmissionService } from './submission.service';

describe('SubmissionService', () => {
  let service: SubmissionService;

  const mockSubmissionRepository = {
    findOne: jest.fn(),
  };

  const mockUser: JwtPayload = {
    userId: 1,
    courseId: 1,
    roles: [RoleEnum.STUDENT],
    sub: '',
    iss: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepository,
        },
        { provide: getRepositoryToken(Problem), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Language), useValue: {} },
        { provide: getRepositoryToken(Contest), useValue: {} },
        { provide: getRepositoryToken(ContestParticipation), useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: StoragesService, useValue: {} },
        { provide: Judge0Service, useValue: {} },
        { provide: RedisKeys, useValue: {} },
        { provide: GradingStrategyService, useValue: {} },
        { provide: REDIS, useValue: {} },
        { provide: SubmissionCursorService, useValue: {} },
        { provide: TestcaseParserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDetailSubmissionById', () => {
    const submissionId = 1;

    it('should return submission details if found and authorized', async () => {
      const submission = {
        id: submissionId,
        user: { id: mockUser.userId },
      } as Submission;
      mockSubmissionRepository.findOne.mockResolvedValue(submission);
      const result = await service.getDetailSubmissionById(
        submissionId,
        mockUser,
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if submission not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);
      await expect(
        service.getDetailSubmissionById(submissionId, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException if user is not authorized', async () => {
      const submission = { id: submissionId, user: { id: 2 } } as Submission;
      mockSubmissionRepository.findOne.mockResolvedValue(submission);
      await expect(
        service.getDetailSubmissionById(submissionId, mockUser),
      ).rejects.toThrow(HttpException);
    });
  });
});
