import { Test, TestingModule } from '@nestjs/testing';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { Contest } from './entities/contest.entity';
import { DeadlineEnforcement } from './enums/deadline-enforcement.enum';
import { SortBy } from './enums/sort-by.enum';

describe('ContestsController', () => {
  let controller: ContestsController;
  let service: ContestsService;

  const mockContestsService = {
    createContest: jest.fn(),
    update: jest.fn(),
    findContests: jest.fn(),
    getDetailContest: jest.fn(),
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
      controllers: [ContestsController],
      providers: [
        {
          provide: ContestsService,
          useValue: mockContestsService,
        },
      ],
    }).compile();

    controller = module.get<ContestsController>(ContestsController);
    service = module.get<ContestsService>(ContestsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createContest', () => {
    it('should create a contest', async () => {
      const createContestDto: CreateContestDto = {
        name: 'Test Contest',
        description: 'Test Description',
        startTime: new Date(),
        endTime: new Date(),
        problems: [],
        deadlineEnforcement: DeadlineEnforcement.FLEXIBLE,
      };
      const expectedResult = new Contest();
      mockContestsService.createContest.mockResolvedValue(expectedResult);

      const result = await controller.createContest(createContestDto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.createContest).toHaveBeenCalledWith(
        createContestDto,
        mockUser,
      );
    });
  });

  describe('updateContest', () => {
    it('should update a contest', async () => {
      const updateContestDto: UpdateContestDto = {
        name: 'Updated Contest',
      };
      const contestId = '1';
      const expectedResult = new Contest();
      mockContestsService.update.mockResolvedValue(expectedResult);

      const result = await controller.updateContest(
        contestId,
        updateContestDto,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(
        +contestId,
        updateContestDto,
        mockUser,
      );
    });
  });

  describe('findContests', () => {
    it('should find contests', async () => {
      const query = {
        limit: 10,
        search: 'test',
        cursor: 'cursor',
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.ASC,
        matchMode: MatchMode.ALL,
      };
      const expectedResult = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      };
      mockContestsService.findContests.mockResolvedValue(expectedResult);

      const result = await controller.findContests(query, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.findContests).toHaveBeenCalledWith(query, mockUser);
    });
  });

  describe('getDetailContest', () => {
    it('should get detail of a contest', async () => {
      const contestId = '1';
      const expectedResult = new Contest();
      mockContestsService.getDetailContest.mockResolvedValue(expectedResult);

      const result = await controller.getDetailContest(contestId, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getDetailContest).toHaveBeenCalledWith(
        +contestId,
        mockUser,
      );
    });
  });
});
