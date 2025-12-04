import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisService } from 'src/shared/redis/redis.service';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';
import { RoleEnum } from '../user/enums/role.enum';
import { IdTokenPayloadDto } from './dto/id-token-payload.dto';
import { LtiDeepLinkingRequestDto } from './dto/lti-deep-linking-request.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiResourceLinkDto } from './dto/lti-resource-link.dto';
import { LtiLaunchSession } from './entities/lti-launch-session.entity';
import { LtiUtilService } from './lti-util.service';
import { LtiService } from './lti.service';
import { DeepLinkingFactory } from './strategies/deep-linking/deep-linking.factory';
import { ResourceUrlFactory } from './strategies/resource-url.factory';

describe('LtiService', () => {
  let service: LtiService;
  let ltiLaunchSessionRepository: Repository<LtiLaunchSession>;
  let resourceUrlFactory: ResourceUrlFactory;
  let ltiUtilService: LtiUtilService;

  const mockConfigService = { get: jest.fn() };
  const mockRedisService = { set: jest.fn() };
  const mockLtiLaunchSessionRepository = { create: jest.fn(), save: jest.fn() };
  const mockResourceUrlFactory = { getBuilder: jest.fn() };
  const mockDeepLinkingFactory = { getStrategy: jest.fn() };
  const mockLtiUtilService = {
    validateAndGetNonceFromState: jest.fn(),
    getAndValidateClaims: jest.fn(),
    upsertUserFromClaims: jest.fn(),
    processCourseAndEnrollUser: jest.fn(),
    issueTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LtiService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: getRepositoryToken(LtiLaunchSession),
          useValue: mockLtiLaunchSessionRepository,
        },
        { provide: ResourceUrlFactory, useValue: mockResourceUrlFactory },
        { provide: DeepLinkingFactory, useValue: mockDeepLinkingFactory },
        { provide: LtiUtilService, useValue: mockLtiUtilService },
      ],
    }).compile();

    service = module.get<LtiService>(LtiService);
    ltiLaunchSessionRepository = module.get<Repository<LtiLaunchSession>>(
      getRepositoryToken(LtiLaunchSession),
    );
    resourceUrlFactory = module.get<ResourceUrlFactory>(ResourceUrlFactory);
    ltiUtilService = module.get<LtiUtilService>(LtiUtilService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleLoginInitiation', () => {
    it('should throw BadRequestException for invalid issuer', async () => {
      const dto = { iss: 'invalid' } as LtiLoginInitiationDto;
      mockConfigService.get.mockReturnValue('valid_issuer');
      await expect(service.handleLoginInitiation(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleLtiLaunch', () => {
    it('should handle LTI launch', async () => {
      const dto = {
        state: 'state',
        idToken: 'id_token',
      } as LtiLaunchRequestDto;
      const nonce = 'nonce';
      const claims: IdTokenPayloadDto = {
        customClaims: { contestId: '1', contentType: 'contest' },
        sub: 'lti_user_id',
        resourceLink: {
          id: 'resource_link_id',
          title: 'title',
          description: 'description',
        },
        context: { id: 'context_id', label: 'label', title: 'title' },
        deploymentId: 'deployment_id',
        iss: 'issuer',
        agsEndpoint: {
          lineitem: 'lineitem_url',
          scope: ['scope1'],
        },
      } as unknown as IdTokenPayloadDto;
      const user: User = { id: 1, roles: [RoleEnum.STUDENT] } as User;
      const course: Course = { id: 1 } as Course;
      const ltiSession: LtiLaunchSession = {
        id: 'session_id',
      } as LtiLaunchSession;
      const tokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
        deviceId: 'device',
      };
      const redirectPath = 'redirect_path';
      const postRedirectUrl = 'post_redirect_url';

      mockLtiUtilService.validateAndGetNonceFromState.mockResolvedValue(nonce);
      mockLtiUtilService.getAndValidateClaims.mockResolvedValue(claims);
      mockLtiUtilService.upsertUserFromClaims.mockResolvedValue(user);
      mockLtiUtilService.processCourseAndEnrollUser.mockResolvedValue(course);
      mockLtiLaunchSessionRepository.create.mockReturnValue(ltiSession);
      mockLtiLaunchSessionRepository.save.mockResolvedValue(ltiSession);
      mockLtiUtilService.issueTokens.mockResolvedValue(tokens);

      const resourceUrlBuilder = {
        buildRedirectUrl: jest.fn().mockReturnValue(redirectPath),
        buildSetCookiesUrl: jest.fn().mockReturnValue(postRedirectUrl),
      };
      mockResourceUrlFactory.getBuilder.mockReturnValue(resourceUrlBuilder);

      const result = await service.handleLtiLaunch(dto);

      expect(result).toEqual({ ...tokens, redirectPath, postRedirectUrl });
      expect(ltiUtilService.validateAndGetNonceFromState).toHaveBeenCalledWith(
        dto.state,
      );
      expect(ltiUtilService.getAndValidateClaims).toHaveBeenCalled();
      expect(ltiUtilService.upsertUserFromClaims).toHaveBeenCalledWith(claims);
      expect(ltiUtilService.processCourseAndEnrollUser).toHaveBeenCalledWith(
        claims,
        user,
      );
      expect(ltiLaunchSessionRepository.save).toHaveBeenCalledWith(ltiSession);
      expect(ltiUtilService.issueTokens).toHaveBeenCalled();
      expect(resourceUrlFactory.getBuilder).toHaveBeenCalledWith(
        claims.customClaims.contentType,
      );
    });
  });

  describe('handleDeepLinkingRequest', () => {
    it('should handle deep linking request', async () => {
      const dto = {} as LtiDeepLinkingRequestDto;
      const strategy = { handleRequest: jest.fn() };
      mockDeepLinkingFactory.getStrategy.mockReturnValue(strategy);
      await service.handleDeepLinkingRequest(dto);
      expect(strategy.handleRequest).toHaveBeenCalledWith(dto);
    });
  });

  describe('handleDeepLinkingResponse', () => {
    it('should handle deep linking response', async () => {
      const deviceId = 'device_id';
      const user = {} as JwtPayload;
      const dto = {} as LtiResourceLinkDto;
      const strategy = { handleResponse: jest.fn() };
      mockDeepLinkingFactory.getStrategy.mockReturnValue(strategy);
      await service.handleDeepLinkingResponse(deviceId, user, dto);
      expect(strategy.handleResponse).toHaveBeenCalledWith(dto, user, deviceId);
    });
  });
});
