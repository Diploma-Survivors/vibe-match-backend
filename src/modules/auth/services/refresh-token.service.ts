import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../../modules/user/entities/user.entity';
import { hash, compare } from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @deprecated use jwt-auth.service.ts to generate refresh token instead of unique string
   */
  public async createRefreshToken(user: User): Promise<string> {
    const refreshTokenTTL = this.configService.get<number>(
      'auth.jwt.refreshTokenTtl',
    ) as number;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + refreshTokenTTL);

    const tokenString: string = (
      crypto.randomBytes as (size: number) => Buffer
    )(32).toString('hex');
    const hashedToken: string = await (
      hash as (data: string, saltOrRounds: string | number) => Promise<string>
    )(tokenString, 10);

    const newRefreshToken = this.refreshTokenRepository.create({
      token: hashedToken,
      userId: user.id,
      expiresAt: expiresAt,
    });

    await this.refreshTokenRepository.save(newRefreshToken);
    this.logger.log(`Created refresh token for user ${user.id}`);
    return tokenString;
  }

  public async validateRefreshToken(tokenString: string): Promise<User> {
    const refreshTokenEntities = await this.refreshTokenRepository.find({
      relations: ['user'],
      where: {
        revokedAt: undefined,
      },
    });

    for (const rt of refreshTokenEntities) {
      const isMatch: boolean = await (
        compare as (data: string, encrypted: string) => Promise<boolean>
      )(tokenString, rt.token);

      if (isMatch) {
        if (rt.expiresAt < new Date()) {
          this.logger.warn(
            `Expired refresh token found for user ${rt.userId}. Revoking.`,
          );
          await this.revokeRefreshToken(rt.token);
          throw new UnauthorizedException('Refresh token expired');
        }

        await this.revokeRefreshToken(rt.token);
        this.logger.log(
          `Refresh token validated and revoked for user ${rt.userId}`,
        );
        return rt.user;
      }
    }

    this.logger.warn(`Invalid refresh token provided.`);
    throw new UnauthorizedException('Invalid refresh token');
  }

  public async revokeRefreshToken(hashedToken: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: hashedToken },
      { revokedAt: new Date() },
    );
    this.logger.log(`Refresh token ${hashedToken} revoked.`);
  }

  public async revokeAllRefreshTokensForUser(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: undefined },
      { revokedAt: new Date() },
    );
    this.logger.log(`All refresh tokens revoked for user ${userId}`);
  }
}
