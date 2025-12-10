import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { compare } from 'bcrypt';
import { Repository } from 'typeorm';

import { Tenant } from '../user/entities/tenant.entity';
import { User } from '../user/entities/user.entity';
import { AuthTypeEnum } from '../user/enums/auth-type.enum';
import { RoleEnum } from '../user/enums/role.enum';
import { TenantType } from '../user/enums/tenant-type.enum';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { Auth } from './entities/auth.entity';
import { JwtAuthService } from './jwt-auth.service';

jest.mock('typeorm-transactional', () => ({
  initializeTransactionalContext: jest.fn(),
  patchTypeORMRepositoryWithBaseRepository: jest.fn(),
  addTransactionalDataSource: jest.fn(),
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: MethodDecorator) =>
      descriptor,
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: Repository<Auth>;
  let tenantRepository: Repository<Tenant>;
  let userService: UserService;
  let jwtAuthService: JwtAuthService;

  const mockAuthRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTenantRepository = {
    findOne: jest.fn(),
  };

  const mockUserService = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtAuthService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    generateDeviceId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Auth),
          useValue: mockAuthRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get<Repository<Auth>>(getRepositoryToken(Auth));
    tenantRepository = module.get<Repository<Tenant>>(
      getRepositoryToken(Tenant),
    );
    userService = module.get<UserService>(UserService);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    const signUpDto: SignUpDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create a new user successfully', async () => {
      const platformTenant = {
        id: 1,
        name: 'Platform',
        type: TenantType.PLATFORM,
      } as Tenant;

      mockUserService.findOne.mockResolvedValue(null);
      mockTenantRepository.findOne.mockResolvedValue(platformTenant);
      mockUserService.create.mockResolvedValue({
        id: 1,
        ...signUpDto,
        roles: [RoleEnum.STUDENT],
        authType: AuthTypeEnum.LOCAL,
        tenantId: platformTenant.id,
      });

      await service.signUp(signUpDto);

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { type: TenantType.PLATFORM },
      });
      expect(userService.create).toHaveBeenCalledWith({
        ...signUpDto,
        roles: [RoleEnum.STUDENT],
        authType: AuthTypeEnum.LOCAL,
        tenantId: platformTenant.id,
      });
    });

    it('should throw BadRequestException if user already exists', async () => {
      const existingUser = {
        id: 1,
        email: signUpDto.email,
      } as User;

      mockUserService.findOne.mockResolvedValue(existingUser);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        new BadRequestException('User with this email already exists'),
      );

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(tenantRepository.findOne).not.toHaveBeenCalled();
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if platform tenant not found', async () => {
      mockUserService.findOne.mockResolvedValue(null);
      mockTenantRepository.findOne.mockResolvedValue(null);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        new BadRequestException(
          'Platform tenant not found. Please contact administrator.',
        ),
      );

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { type: TenantType.PLATFORM },
      });
      expect(userService.create).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
    };

    const mockUser = {
      id: 1,
      email: signInDto.email,
      password: '$2b$10$hashedPassword',
      firstName: 'John',
      lastName: 'Doe',
      roles: [RoleEnum.STUDENT],
      authType: AuthTypeEnum.LOCAL,
    } as User;

    it('should sign in successfully and return tokens', async () => {
      const deviceId = 'device-123';
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-123';

      mockUserService.findOne.mockResolvedValue(mockUser);
      (compare as jest.Mock).mockResolvedValue(true);
      mockJwtAuthService.generateDeviceId.mockResolvedValue(deviceId);
      mockJwtAuthService.generateAccessToken.mockResolvedValue(accessToken);
      mockJwtAuthService.generateRefreshToken.mockResolvedValue(refreshToken);

      const result = await service.signIn(signInDto);

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(compare).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.password,
      );
      expect(jwtAuthService.generateDeviceId).toHaveBeenCalled();
      expect(jwtAuthService.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        roles: mockUser.roles,
      });
      expect(jwtAuthService.generateRefreshToken).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          roles: mockUser.roles,
        },
        deviceId,
      );
      expect(result).toEqual({
        message: 'Sign in successful',
        accessToken,
        refreshToken,
        deviceId,
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserService.findOne.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Invalid email or password'),
      );

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(compare).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user has wrong auth type', async () => {
      const ltiUser = {
        ...mockUser,
        authType: AuthTypeEnum.LTI,
      } as User;

      mockUserService.findOne.mockResolvedValue(ltiUser);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Invalid email or password'),
      );

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(compare).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user has no password', async () => {
      const userWithoutPassword = {
        ...mockUser,
        password: null,
      } as User;

      mockUserService.findOne.mockResolvedValue(userWithoutPassword);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Invalid email or password'),
      );

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(compare).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if password is invalid', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Invalid email or password'),
      );

      expect(userService.findOne).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(compare).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.password,
      );
      expect(jwtAuthService.generateDeviceId).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of auth records', async () => {
      const authRecords = [
        { id: 1, userId: 1, token: 'token1' },
        { id: 2, userId: 2, token: 'token2' },
      ] as Auth[];

      mockAuthRepository.find.mockResolvedValue(authRecords);

      const result = await service.findAll();

      expect(authRepository.find).toHaveBeenCalled();
      expect(result).toEqual(authRecords);
    });

    it('should return an empty array if no auth records exist', async () => {
      mockAuthRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(authRepository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single auth record', async () => {
      const id = 1;
      const authRecord = { id, userId: 1, token: 'token1' } as Auth;

      mockAuthRepository.findOne.mockResolvedValue(authRecord);

      const result = await service.findOne(id);

      expect(authRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(authRecord);
    });

    it('should return null if auth record not found', async () => {
      const id = 999;

      mockAuthRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(id);

      expect(authRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete an auth record', async () => {
      const id = 1;
      const deleteResult = { affected: 1, raw: [] };

      mockAuthRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.remove(id);

      expect(authRepository.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(deleteResult);
    });

    it('should return affected: 0 if auth record not found', async () => {
      const id = 999;
      const deleteResult = { affected: 0, raw: [] };

      mockAuthRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.remove(id);

      expect(authRepository.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(deleteResult);
    });
  });
});
