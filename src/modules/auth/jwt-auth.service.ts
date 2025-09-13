import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt.interface';
import { JwtConfig } from '../../config/auth.config'; // Import JwtConfig

@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public generateAccessToken(payload: JwtPayload): string {
    const jwtConfig = this.configService.get<{
      jwt: JwtConfig;
    }>('auth')?.jwt;

    if (!jwtConfig) {
      throw new Error('JWT configuration not found.');
    }

    const accessTokenTtl = jwtConfig.accessTokenTtl;
    const secret = jwtConfig.secret;
    const audience = jwtConfig.tokenAudience;

    return this.jwtService.sign(payload, {
      secret: secret,
      expiresIn: accessTokenTtl,
      audience: audience,
    });
  }

  public generateRefreshToken(payload: JwtPayload): string {
    const jwtConfig = this.configService.get<{
      jwt: JwtConfig;
    }>('auth')?.jwt;

    if (!jwtConfig) {
      throw new Error('JWT configuration not found.');
    }

    const refreshTokenTtl = jwtConfig.refreshTokenTtl;
    const refreshTokenSecret = jwtConfig.refreshTokenSecret;
    const audience = jwtConfig.tokenAudience;

    return this.jwtService.sign(payload, {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenTtl,
      audience: audience,
    });
  }

  public async verifyJwt(
    token: string,
    isRefreshToken = false,
  ): Promise<JwtPayload> {
    const jwtConfig = this.configService.get<{
      jwt: JwtConfig;
    }>('auth')?.jwt;

    if (!jwtConfig) {
      throw new Error('JWT configuration not found.');
    }

    const secret = isRefreshToken
      ? jwtConfig.refreshTokenSecret
      : jwtConfig.secret;
    const audience = jwtConfig.tokenAudience;
    const issuer = jwtConfig.tokenIssuer;

    return this.jwtService.verify(token, {
      secret: secret,
      audience: audience,
      issuer: issuer,
      ignoreExpiration: isRefreshToken,
    });
  }
}
