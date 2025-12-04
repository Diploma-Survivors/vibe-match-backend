import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call userService.create with the correct parameters', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password',
      } as CreateUserDto;
      await controller.create(createUserDto);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should call userService.findAll', async () => {
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call userService.findOne with the correct parameters', async () => {
      const id = '1';
      await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith({ where: { id: +id } });
    });
  });

  describe('update', () => {
    it('should call userService.update with the correct parameters', async () => {
      const id = '1';
      const updateUserDto = { email: 'new@example.com' } as UpdateUserDto;
      await controller.update(id, updateUserDto);
      expect(service.update).toHaveBeenCalledWith(+id, updateUserDto);
    });
  });

  describe('remove', () => {
    it('should call userService.remove with the correct parameters', async () => {
      const id = '1';
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(+id);
    });
  });
});
