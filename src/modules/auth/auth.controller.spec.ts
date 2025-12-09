import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { RoleEnum } from '../user/enums/role.enum';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtPayload } from './interfaces/jwt.interface';
import { JwtAuthService } from './jwt-auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let jwtAuthService: JwtAuthService;
  let configService: ConfigService;
  let logger: Logger;

  const mockAuthService = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signUp', () => {
    const signUpDto: SignUpDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should sign up a new user successfully', async () => {
      mockAuthService.signUp.mockResolvedValue(undefined);

      const result = await controller.signUp(signUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual({
        message: 'User registered successfully',
      });
    });

    it('should propagate errors from authService.signUp', async () => {
      const error = new Error('User already exists');
      mockAuthService.signUp.mockRejectedValue(error);

      await expect(controller.signUp(signUpDto)).rejects.toThrow(error);
      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
    });
  });

  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
    };

    it('should sign in successfully and return tokens', async () => {
      const authResponse = {
        message: 'Sign in successful',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        deviceId: 'device-123',
      };

      mockAuthService.signIn.mockResolvedValue(authResponse);

      const result = await controller.signIn(signInDto);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
      expect(result).toEqual(authResponse);
    });

    it('should propagate errors from authService.signIn', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.signIn.mockRejectedValue(error);

      await expect(controller.signIn(signInDto)).rejects.toThrow(error);
      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
    });
  });

  describe('refreshTokens', () => {
    const refreshTokenDto: RefreshTokenDto = {
      deviceId: 'device-123',
    };

    const jwtPayload: JwtPayload = {
      userId: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: [RoleEnum.STUDENT],
    };

    const mockResponse = () => {
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };
      return res as Response;
    };

    it('should refresh tokens successfully', async () => {
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';
      const res = mockResponse();

      mockJwtAuthService.generateAccessToken.mockResolvedValue(newAccessToken);
      mockJwtAuthService.generateRefreshToken.mockResolvedValue(
        newRefreshToken,
      );
      mockConfigService.get.mockReturnValue({
        jwt: {
          secret: 'test-secret',
          refreshTokenSecret: 'test-refresh-secret',
          accessTokenTtl: 900,
          refreshTokenTtl: 604800,
          tokenAudience: 'test-audience',
        },
      });

      await controller.refreshTokens(res, refreshTokenDto, jwtPayload);

      expect(configService.get).toHaveBeenCalledWith('auth');
      expect(jwtAuthService.generateAccessToken).toHaveBeenCalledWith(
        jwtPayload,
      );
      expect(jwtAuthService.generateRefreshToken).toHaveBeenCalledWith(
        jwtPayload,
        refreshTokenDto.deviceId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tokens refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    });

    it('should throw UnauthorizedException if JWT config not found', async () => {
      const res = mockResponse();

      mockConfigService.get.mockReturnValue(null);

      await expect(
        controller.refreshTokens(res, refreshTokenDto, jwtPayload),
      ).rejects.toThrow(UnauthorizedException);

      expect(logger.error).toHaveBeenCalledWith(
        'JWT configuration not found during token refresh.',
      );
    });

    it('should throw UnauthorizedException if token generation fails', async () => {
      const res = mockResponse();
      const error = new Error('Token generation failed');

      mockJwtAuthService.generateAccessToken.mockRejectedValue(error);
      mockConfigService.get.mockReturnValue({
        jwt: {
          secret: 'test-secret',
          refreshTokenSecret: 'test-refresh-secret',
          accessTokenTtl: 900,
          refreshTokenTtl: 604800,
          tokenAudience: 'test-audience',
        },
      });

      await expect(
        controller.refreshTokens(res, refreshTokenDto, jwtPayload),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));

      expect(logger.error).toHaveBeenCalled();
    });

    it('should propagate UnauthorizedException from token generation', async () => {
      const res = mockResponse();
      const error = new UnauthorizedException('Token expired');

      mockJwtAuthService.generateAccessToken.mockRejectedValue(error);
      mockConfigService.get.mockReturnValue({
        jwt: {
          secret: 'test-secret',
          refreshTokenSecret: 'test-refresh-secret',
          accessTokenTtl: 900,
          refreshTokenTtl: 604800,
          tokenAudience: 'test-audience',
        },
      });

      await expect(
        controller.refreshTokens(res, refreshTokenDto, jwtPayload),
      ).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const mockResponse = () => {
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };
      return res as Response;
    };

    it('should logout successfully', () => {
      const res = mockResponse();

      controller.logout(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of auth records', async () => {
      const authRecords = [
        { id: 1, userId: 1, token: 'token1' },
        { id: 2, userId: 2, token: 'token2' },
      ];

      mockAuthService.findAll.mockResolvedValue(authRecords);

      const result = await controller.findAll();

      expect(authService.findAll).toHaveBeenCalled();
      expect(result).toEqual(authRecords);
    });

    it('should return an empty array if no auth records exist', async () => {
      mockAuthService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(authService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single auth record', async () => {
      const id = '1';
      const authRecord = { id: 1, userId: 1, token: 'token1' };

      mockAuthService.findOne.mockResolvedValue(authRecord);

      const result = await controller.findOne(id);

      expect(authService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(authRecord);
    });

    it('should handle string id conversion', async () => {
      const id = '123';
      const authRecord = { id: 123, userId: 1, token: 'token1' };

      mockAuthService.findOne.mockResolvedValue(authRecord);

      const result = await controller.findOne(id);

      expect(authService.findOne).toHaveBeenCalledWith(123);
      expect(result).toEqual(authRecord);
    });
  });

  describe('remove', () => {
    it('should remove an auth record', async () => {
      const id = '1';
      const deleteResult = { affected: 1, raw: [] };

      mockAuthService.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove(id);

      expect(authService.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResult);
    });

    it('should handle string id conversion', async () => {
      const id = '456';
      const deleteResult = { affected: 1, raw: [] };

      mockAuthService.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove(id);

      expect(authService.remove).toHaveBeenCalledWith(456);
      expect(result).toEqual(deleteResult);
    });
  });
});
