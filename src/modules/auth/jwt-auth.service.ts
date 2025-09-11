import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { RedisService } from 'src/shared/redis/redis.service';
import { JwtConfig } from '../../config/auth.config';
import { JwtPayload } from './interfaces/jwt.interface';

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  public async generateAccessToken(payload: JwtPayload): Promise<string> {
    const jwtConfig = this.configService.get<{
      jwt: JwtConfig;
    }>('auth')?.jwt;

    if (!jwtConfig) {
      throw new Error('JWT configuration not found.');
    }

    const accessTokenTtl = jwtConfig.accessTokenTtl;
    const secret = jwtConfig.secret;
    const audience = jwtConfig.tokenAudience;

    return await this.jwtService.signAsync(payload, {
      secret: secret,
      expiresIn: accessTokenTtl,
      audience: audience,
    });
  }

  public async generateRefreshToken(
    payload: JwtPayload,
    deviceId: string,
  ): Promise<string> {
    const jwtConfig = this.configService.get<{
      jwt: JwtConfig;
    }>('auth')?.jwt;

    if (!jwtConfig) {
      throw new Error('JWT configuration not found.');
    }

    const refreshTokenTtl = jwtConfig.refreshTokenTtl;
    const refreshTokenSecret = jwtConfig.refreshTokenSecret;
    const audience = jwtConfig.tokenAudience;

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenTtl,
      audience: audience,
    });

    const refreshTokenHashed = this.hashRefreshToken(refreshToken);
    const redisKey = this.getRefreshTokenKey(payload.userId, deviceId);
    await this.redisService.set(redisKey, refreshTokenHashed, refreshTokenTtl);
    this.logger.log(
      `Stored refresh token in Redis with key ${redisKey} and TTL ${refreshTokenTtl} seconds.`,
    );

    return refreshToken;
  }

  public async validateRefreshToken(
    token: string,
    deviceId: string,
  ): Promise<JwtPayload> {
    try {
      const jwt: JwtPayload = await this.jwtService.decode(token);

      const redisKey = this.getRefreshTokenKey(jwt.userId, deviceId);
      const storedHashedToken = await this.redisService.get(redisKey);

      const handleInvalidRefreshToken = async () => {
        await this.revokeAllRefreshTokensForUser(jwt.userId);
        this.logger.warn(
          `No refresh token found in Redis for user ${jwt.userId} and device ${deviceId}. Possible token reuse.`,
        );
        throw new UnauthorizedException('Invalid refresh token');
      };

      if (!storedHashedToken) {
        await handleInvalidRefreshToken();
      }

      const isValid = this.compareRefreshTokens(
        token,
        storedHashedToken as string,
      );
      if (!isValid) {
        await handleInvalidRefreshToken();
      }

      await this.revokeRefreshToken(jwt.userId, deviceId);

      return jwt;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  public async generateDeviceId(): Promise<string> {
    return Promise.resolve(randomBytes(16).toString('hex'));
  }

  public async revokeRefreshToken(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    const redisKey = this.getRefreshTokenKey(userId, deviceId);
    await this.redisService.del(redisKey);
    this.logger.log(`Revoked refresh token in Redis with key ${redisKey}.`);
  }

  public async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    const pattern = `refresh:${userId}:*`;
    await this.redisService.deleteByPattern(pattern);
    this.logger.log(`Revoked all refresh tokens for user ${userId}.`);
  }

  private getRefreshTokenKey(userId: string, deviceId: string): string {
    return `refresh:${userId}:${deviceId}`;
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private compareRefreshTokens(token: string, hashedToken: string): boolean {
    const tokenHash = this.hashRefreshToken(token);
    return tokenHash === hashedToken;
  }
}
