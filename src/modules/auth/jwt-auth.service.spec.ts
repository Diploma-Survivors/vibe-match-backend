import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'src/shared/redis/redis.service';
import { JwtPayload } from './interfaces/jwt.interface';
import { JwtAuthService } from './jwt-auth.service';

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let redisService: RedisService;

  const mockJwtService = {
    signAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    deleteByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should generate an access token', async () => {
      const payload: JwtPayload = { userId: 1, roles: [] };
      const token = 'access_token';
      mockConfigService.get.mockReturnValue({
        jwt: {
          accessTokenTtl: 3600,
          secret: 'secret',
          tokenAudience: 'audience',
        },
      });
      mockJwtService.signAsync.mockResolvedValue(token);

      const result = await service.generateAccessToken(payload);

      expect(result).toBe(token);
      expect(configService.get).toHaveBeenCalledWith('auth');
      expect(jwtService.signAsync).toHaveBeenCalled();
    });

    it('should throw an error if jwt config is not found', async () => {
      const payload: JwtPayload = { userId: 1, roles: [] };
      mockConfigService.get.mockReturnValue(null);

      await expect(service.generateAccessToken(payload)).rejects.toThrow(
        'JWT configuration not found.',
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token and store it in redis', async () => {
      const payload: JwtPayload = { userId: 1, roles: [] };
      const deviceId = 'device_id';
      const token = 'refresh_token';
      mockConfigService.get.mockReturnValue({
        jwt: {
          refreshTokenTtl: 86400,
          refreshTokenSecret: 'refresh_secret',
          tokenAudience: 'audience',
        },
      });
      mockJwtService.signAsync.mockResolvedValue(token);

      const result = await service.generateRefreshToken(payload, deviceId);

      expect(result).toBe(token);
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    const token = 'refresh_token';
    const deviceId = 'device_id';
    const payload: JwtPayload = { userId: 1, roles: [] };
    const hashedToken = 'hashed_token';

    it('should validate a refresh token and return the payload', async () => {
      // Correctly mock the hashRefreshToken method by spying on the service instance
      const hashRefreshTokenSpy = jest
        .spyOn(service as any, 'hashRefreshToken')
        .mockReturnValue(hashedToken);
      // Correctly mock the compareRefreshTokens method
      const compareRefreshTokensSpy = jest
        .spyOn(service as any, 'compareRefreshTokens')
        .mockReturnValue(true);

      mockJwtService.decode.mockReturnValue(payload);
      mockRedisService.get.mockResolvedValue(hashedToken); // Assume the stored token is the correctly hashed one

      const result = await service.validateRefreshToken(token, deviceId);

      expect(result).toEqual(payload);
      expect(redisService.get).toHaveBeenCalledWith(`refresh:1:${deviceId}`);
      expect(compareRefreshTokensSpy).toHaveBeenCalledWith(token, hashedToken);
      expect(redisService.del).toHaveBeenCalledWith(`refresh:1:${deviceId}`);

      // Restore the original methods
      hashRefreshTokenSpy.mockRestore();
      compareRefreshTokensSpy.mockRestore();
    });

    it('should throw UnauthorizedException if token is not in redis', async () => {
      mockJwtService.decode.mockReturnValue(payload);
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.validateRefreshToken(token, deviceId),
      ).rejects.toThrow(UnauthorizedException);
      expect(redisService.deleteByPattern).toHaveBeenCalledWith('refresh:1:*');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwtService.decode.mockReturnValue(payload);
      mockRedisService.get.mockResolvedValue(hashedToken);
      const compareRefreshTokensSpy = jest
        .spyOn(service as any, 'compareRefreshTokens')
        .mockReturnValue(false);

      await expect(
        service.validateRefreshToken(token, deviceId),
      ).rejects.toThrow(UnauthorizedException);
      expect(redisService.deleteByPattern).toHaveBeenCalledWith('refresh:1:*');
      compareRefreshTokensSpy.mockRestore();
    });
  });

  describe('generateDeviceId', () => {
    it('should generate a device id', async () => {
      const deviceId = await service.generateDeviceId();
      expect(deviceId).toBeDefined();
      expect(typeof deviceId).toBe('string');
      expect(deviceId.length).toBe(32);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token', async () => {
      const userId = 1;
      const deviceId = 'device_id';
      await service.revokeRefreshToken(userId, deviceId);
      expect(redisService.del).toHaveBeenCalledWith(
        `refresh:${userId}:${deviceId}`,
      );
    });
  });

  describe('revokeAllRefreshTokensForUser', () => {
    it('should revoke all refresh tokens for a user', async () => {
      const userId = 1;
      await service.revokeAllRefreshTokensForUser(userId);
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        `refresh:${userId}:*`,
      );
    });
  });
});
