import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JWTVerifyResult } from 'jose';
import { JwtAuthService } from 'src/modules/auth/jwt-auth.service';
import { CourseService } from 'src/modules/course/services/course.service';
import { UserCourseService } from 'src/modules/user-course/services/user-course.service';
import { UserService } from 'src/modules/user/user.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';
import { RoleEnum } from '../user/enums/role.enum';
import { LTI_VERSIONS } from './constants/lti.constants';
import { LTI_STATE_PREFIX } from './constants/redis.constants';
import { IdTokenPayloadDto } from './dto/id-token-payload.dto';
import { LtiDeployment } from './entities/lti-deployment.entity';
import { LtiMessageType } from './enums/lti-message-type.enum';
import { LtiUtilService } from './lti-util.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe('LtiUtilService', () => {
  let service: LtiUtilService;

  const mockConfigService = { get: jest.fn() };
  const mockRedisService = { get: jest.fn(), del: jest.fn() };
  const mockUserService = { findOrCreateByLtiClaims: jest.fn() };
  const mockJwtAuthService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    generateDeviceId: jest.fn(),
  };
  const mockCourseService = { findOrCreateByLtiContextClaims: jest.fn() };
  const mockUserCourseService = { enrollUserInCourse: jest.fn() };
  const mockLtiDeploymentRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LtiUtilService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: UserService, useValue: mockUserService },
        { provide: JwtAuthService, useValue: mockJwtAuthService },
        { provide: CourseService, useValue: mockCourseService },
        { provide: UserCourseService, useValue: mockUserCourseService },
        {
          provide: getRepositoryToken(LtiDeployment),
          useValue: mockLtiDeploymentRepository,
        },
      ],
    }).compile();

    service = module.get<LtiUtilService>(LtiUtilService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAndGetNonceFromState', () => {
    it('should return nonce from state', async () => {
      const state = 'state';
      const nonce = 'nonce';
      const storedState = JSON.stringify({ nonce });
      mockRedisService.get.mockResolvedValue(storedState);
      const result = await service.validateAndGetNonceFromState(state);
      expect(result).toBe(nonce);
      expect(mockRedisService.get).toHaveBeenCalledWith(
        `${LTI_STATE_PREFIX}${state}`,
      );
    });
  });

  describe('getStateFromRedis', () => {
    it('should throw UnauthorizedException if state not in redis', async () => {
      const state = 'state';
      mockRedisService.get.mockResolvedValue(null);
      await expect(service.getStateFromRedis(state)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getAndValidateClaims', () => {
    const idToken = 'idToken';
    const nonce = 'nonce';
    const messageType = LtiMessageType.LTI_RESOURCE_LINK_REQUEST;
    const claims = {
      version: LTI_VERSIONS.V1_3,
      messageType,
      nonce,
    } as IdTokenPayloadDto;

    it('should get and validate claims', async () => {
      jest
        .spyOn(service, 'verifyJwtFromPlatform')
        .mockResolvedValue({} as JWTVerifyResult);
      jest.spyOn(service, 'transformIdTokenPayload').mockReturnValue(claims);
      const result = await service.getAndValidateClaims(
        idToken,
        messageType,
        nonce,
      );
      expect(result).toEqual(claims);
    });

    it('should throw BadRequestException for unsupported LTI version', async () => {
      const invalidClaims = { ...claims, version: '1.2' };
      jest
        .spyOn(service, 'verifyJwtFromPlatform')
        .mockResolvedValue({} as JWTVerifyResult);
      jest
        .spyOn(service, 'transformIdTokenPayload')
        .mockReturnValue(invalidClaims);
      await expect(
        service.getAndValidateClaims(idToken, messageType, nonce),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported message type', async () => {
      const invalidClaims = {
        ...claims,
        messageType: 'none' as LtiMessageType,
      };
      jest
        .spyOn(service, 'verifyJwtFromPlatform')
        .mockResolvedValue({} as JWTVerifyResult);
      jest
        .spyOn(service, 'transformIdTokenPayload')
        .mockReturnValue(invalidClaims);
      await expect(
        service.getAndValidateClaims(idToken, messageType, nonce),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for invalid nonce', async () => {
      const invalidClaims = { ...claims, nonce: 'invalid' };
      jest
        .spyOn(service, 'verifyJwtFromPlatform')
        .mockResolvedValue({} as JWTVerifyResult);
      jest
        .spyOn(service, 'transformIdTokenPayload')
        .mockReturnValue(invalidClaims);
      await expect(
        service.getAndValidateClaims(idToken, messageType, nonce),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('upsertUserFromClaims', () => {
    const ltiDeployment = {
      id: 1,
      name: 'Test Deployment',
      issuerUrl: 'https://lms.example.com',
      clientId: 'client123',
      deploymentId: 'deployment123',
      authenticationUrl: 'https://lms.example.com/auth',
      jwksUrl: 'https://lms.example.com/jwks',
      tokenUrl: 'https://lms.example.com/token',
      isActive: true,
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LtiDeployment;

    it('should upsert user from claims', async () => {
      const claims = {} as IdTokenPayloadDto;
      const user: User = { id: 1, email: 'test@test.com' } as User;
      mockUserService.findOrCreateByLtiClaims.mockResolvedValue(user);
      const result = await service.upsertUserFromClaims(claims, ltiDeployment);
      expect(result).toEqual(user);
      expect(mockUserService.findOrCreateByLtiClaims).toHaveBeenCalledWith(
        claims,
        ltiDeployment,
      );
    });
  });

  describe('processCourseAndEnrollUser', () => {
    const ltiDeployment = {
      id: 1,
      name: 'Test Deployment',
      issuerUrl: 'https://lms.example.com',
      clientId: 'client123',
      deploymentId: 'deployment123',
      authenticationUrl: 'https://lms.example.com/auth',
      jwksUrl: 'https://lms.example.com/jwks',
      tokenUrl: 'https://lms.example.com/token',
      isActive: true,
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LtiDeployment;

    it('should return null if no context in claims', async () => {
      const claims = {} as IdTokenPayloadDto;
      const user = { id: 1 } as User;
      const result = await service.processCourseAndEnrollUser(
        claims,
        user,
        ltiDeployment,
      );
      expect(result).toBeNull();
    });

    it('should process course and enroll user', async () => {
      const claims = { context: {} } as IdTokenPayloadDto;
      const user = { id: 1, roles: [RoleEnum.STUDENT] } as User;
      const course = { id: 1, title: 'course' } as Course;
      mockCourseService.findOrCreateByLtiContextClaims.mockResolvedValue(
        course,
      );
      const result = await service.processCourseAndEnrollUser(
        claims,
        user,
        ltiDeployment,
      );
      expect(result).toEqual(course);
      expect(
        mockCourseService.findOrCreateByLtiContextClaims,
      ).toHaveBeenCalledWith(claims, ltiDeployment);
      expect(mockUserCourseService.enrollUserInCourse).toHaveBeenCalledWith(
        user,
        course,
        user.roles,
      );
    });
  });

  describe('issueTokens', () => {
    it('should issue tokens', async () => {
      const user: User = {
        id: 1,
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [RoleEnum.ADMIN],
      } as User;
      const claims = { sub: 'sub', iss: 'iss' } as IdTokenPayloadDto;
      const course = { id: 1 } as Course;
      const ltiSessionId = 'sessionId';

      const tokenResponse = {
        accessToken: 'access',
        refreshToken: 'refresh',
        deviceId: 'device',
      };

      jest
        .spyOn(service, 'generateTokensForUser')
        .mockResolvedValue(tokenResponse);

      const result = await service.issueTokens(
        user,
        claims,
        course,
        ltiSessionId,
      );

      expect(result).toEqual(tokenResponse);
      const expectedPayload: JwtPayload = {
        userId: user.id,
        courseId: course.id,
        email: user.email!,
        firstName: user.firstName!,
        lastName: user.lastName!,
        roles: user.roles,
        sub: claims.sub,
        iss: claims.iss,
        ltiSessionId: ltiSessionId,
      };
      expect(service.generateTokensForUser).toHaveBeenCalledWith(
        expectedPayload,
      );
    });
  });
});
