import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LTI_ROLES } from '../lti/constants/lti.constants';
import { IdTokenPayloadDto } from '../lti/dto/id-token-payload.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { RoleEnum } from './enums/role.enum';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = { email: 'test@test.com' } as CreateUserDto;
      const user = { id: 1, ...createUserDto };
      mockUserRepository.create.mockReturnValue(user);
      mockUserRepository.save.mockResolvedValue(user);
      const result = await service.create(createUserDto);
      expect(result).toEqual(user);
      expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: 1, email: 'test@test.com' }];
      mockUserRepository.find.mockResolvedValue(users);
      const result = await service.findAll();
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      const user = { id: 1, email: 'test@test.com' };
      mockUserRepository.findOne.mockResolvedValue(user);
      const result = await service.findOne({ where: { id: 1 } });
      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = { email: 'new@test.com' };
      await service.update(1, updateUserDto);
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateUserDto);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      await service.remove(1);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('findOrCreateByLtiClaims', () => {
    const claims = {
      sub: 'ltiSubjectId',
      iss: 'ltiPlatformId',
      roles: [LTI_ROLES.STUDENT],
      givenName: 'givenName',
      familyName: 'familyName',
      email: 'email',
    } as IdTokenPayloadDto;

    it('should create a user if not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = { id: 1 };
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);

      const result = await service.findOrCreateByLtiClaims(claims);

      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual(newUser);
    });

    it('should update a user if found and data is different', async () => {
      const existingUser = {
        id: 1,
        firstName: 'old givenName',
        lastName: 'old familyName',
        email: 'old email',
        roles: [RoleEnum.INSTRUCTOR],
      };
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await service.findOrCreateByLtiClaims(claims);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'givenName',
          lastName: 'familyName',
          email: 'email',
          roles: [RoleEnum.STUDENT],
        }),
      );
    });

    it('should not update a user if found and data is the same', async () => {
      const existingUser = {
        id: 1,
        firstName: 'givenName',
        lastName: 'familyName',
        email: 'email',
        roles: [RoleEnum.STUDENT],
      };
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await service.findOrCreateByLtiClaims(claims);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});
