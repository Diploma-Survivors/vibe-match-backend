import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsCursorQueryDto } from './dto/submission-cursor-query.dto';
import { SortBy } from './enums/submission-search.enum';
import { SubmissionsSseService } from './events/submission-sse.service';
import { CallbackProcessor } from './helpers/callback.processor';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

describe('SubmissionController', () => {
  let controller: SubmissionController;
  let submissionService: SubmissionService;
  let submissionsSseService: SubmissionsSseService;

  const mockSubmissionService = {
    executeTestRun: jest.fn(),
    submitForGrading: jest.fn(),
    submitToContest: jest.fn(),
    getListSubmissionOfUserInOneProblem: jest.fn(),
    getByContestParticipationAndProblem: jest.fn(),
    getDetailSubmissionById: jest.fn(),
  };

  const mockSubmissionsSseService = {
    connect: jest.fn(),
    cleanup: jest.fn(),
  };

  const mockCallbackProcessor = {
    handleCallback: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
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
      controllers: [SubmissionController],
      providers: [
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: SubmissionsSseService, useValue: mockSubmissionsSseService },
        { provide: CallbackProcessor, useValue: mockCallbackProcessor },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubmissionController>(SubmissionController);
    submissionService = module.get<SubmissionService>(SubmissionService);
    submissionsSseService = module.get<SubmissionsSseService>(
      SubmissionsSseService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('run', () => {
    it('should call submissionService.executeTestRun', async () => {
      const dto = new CreateSubmissionDto();
      const file = {} as Express.Multer.File;
      await controller.run(dto, file);
      expect(submissionService.executeTestRun).toHaveBeenCalledWith(dto, file);
    });
  });

  describe('submitForGrading', () => {
    it('should call submissionService.submitForGrading', async () => {
      const dto = new CreateSubmissionDto();
      const file = {} as Express.Multer.File;
      await controller.submitForGrading(dto, mockUser, file);
      expect(submissionService.submitForGrading).toHaveBeenCalledWith(
        dto,
        mockUser,
        file,
      );
    });
  });

  describe('submitToContest', () => {
    it('should call submissionService.submitToContest', async () => {
      const contestId = 1;
      const dto = new CreateSubmissionDto();
      const file = {} as Express.Multer.File;
      await controller.submitToContest(contestId, dto, mockUser, file);
      expect(submissionService.submitToContest).toHaveBeenCalledWith(
        contestId,
        dto,
        mockUser,
        file,
      );
    });
  });

  describe('getByProblem', () => {
    it('should call submissionService.getListSubmissionOfUserInOneProblem', async () => {
      const problemId = 1;
      const query: SubmissionsCursorQueryDto = {
        sortOrder: SortOrder.DESC,
        sortBy: SortBy.CREATED_AT,
        matchMode: MatchMode.ALL,
      };
      await controller.getByProblem(problemId, query, mockUser);
      expect(
        submissionService.getListSubmissionOfUserInOneProblem,
      ).toHaveBeenCalledWith(problemId, mockUser, query);
    });
  });

  describe('streamResults', () => {
    it('should call submissionsSseService.connect', () => {
      const submissionId = 'some-id';
      mockConfigService.get.mockReturnValue(20000); // for ping time
      mockSubmissionsSseService.connect.mockReturnValue(of({} as MessageEvent));
      controller.streamResults(submissionId);
      expect(submissionsSseService.connect).toHaveBeenCalledWith(submissionId);
    });
  });
});
