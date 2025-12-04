import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { MatchMode } from 'src/common/pagination/enums/match-mode.enum';
import { SortOrder } from 'src/common/pagination/enums/sort-order.enum';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { CreateProblemDto } from './dto/create-problem.dto';
import { SortBy } from './enums/sort-by.enum';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';

describe('ProblemsController', () => {
  let controller: ProblemsController;
  let service: ProblemsService;

  const mockProblemsService = {
    create: jest.fn(),
    findProblemsByStudent: jest.fn(),
    findProblemsForContestCreation: jest.fn(),
    findProblemsForManagement: jest.fn(),
    getDetailProblemForInstructor: jest.fn(),
    findDetailProblemById: jest.fn(),
    updateById: jest.fn(),
    remove: jest.fn(),
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
      controllers: [ProblemsController],
      providers: [
        {
          provide: ProblemsService,
          useValue: mockProblemsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProblemsController>(ProblemsController);
    service = module.get<ProblemsService>(ProblemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProblem', () => {
    it('should create a problem', async () => {
      const dto = new CreateProblemDto();
      const file = {} as Express.Multer.File;
      await controller.createProblem(dto, mockUser, file);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser, file);
    });
  });

  describe('findTrainableProblems', () => {
    it('should find trainable problems', async () => {
      const query = {
        limit: 10,
        search: 'test',
        cursor: 'cursor',
        sortBy: SortBy.MAX_SCORE,
        sortOrder: SortOrder.ASC,
        matchMode: MatchMode.ALL,
      };
      await controller.findTrainableProblems(query, mockUser);
      expect(service.findProblemsByStudent).toHaveBeenCalledWith(
        query,
        mockUser,
      );
    });
  });

  describe('findSelectableForContest', () => {
    it('should find selectable problems for contest', async () => {
      const query = {
        limit: 10,
        search: 'test',
        cursor: 'cursor',
        sortBy: SortBy.MAX_SCORE,
        sortOrder: SortOrder.ASC,
        matchMode: MatchMode.ALL,
      };
      await controller.findSelectableForContest(query, mockUser);
      expect(service.findProblemsForContestCreation).toHaveBeenCalledWith(
        query,
        mockUser,
      );
    });
  });

  describe('findProblemsForManagement', () => {
    it('should find problems for management', async () => {
      const query = {
        limit: 10,
        search: 'test',
        cursor: 'cursor',
        sortBy: SortBy.MAX_SCORE,
        sortOrder: SortOrder.ASC,
        matchMode: MatchMode.ALL,
      };
      await controller.findProblemsForManagement(query, mockUser);
      expect(service.findProblemsForManagement).toHaveBeenCalledWith(
        query,
        mockUser,
      );
    });
  });

  describe('findDetailedProblemById', () => {
    it('should find detailed problem by id', async () => {
      const id = '1';
      await controller.findDetailedProblemById(id, mockUser);
      expect(service.getDetailProblemForInstructor).toHaveBeenCalledWith(
        +id,
        mockUser,
      );
    });
  });

  describe('findOne', () => {
    it('should find one problem', async () => {
      const id = '1';
      await controller.findOne(id, mockUser);
      expect(service.findDetailProblemById).toHaveBeenCalledWith(+id, mockUser);
    });
  });

  describe('update', () => {
    it('should update a problem', async () => {
      const id = '1';
      const dto = new CreateProblemDto();
      const file = {} as Express.Multer.File;
      await controller.update(id, dto, mockUser, file);
      expect(service.updateById).toHaveBeenCalledWith(+id, dto, mockUser, file);
    });
  });

  describe('remove', () => {
    it('should remove a problem', async () => {
      const id = '1';
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
