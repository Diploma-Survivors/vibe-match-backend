import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtAuthService } from '../jwt-auth.service';
import { JwtPayload } from '../interfaces/jwt.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly jwtAuthService: JwtAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req?.cookies as Record<string, string>)?.['refresh_token'] || null,
      ]),
      secretOrKey: configService.getOrThrow<string>(
        'auth.jwt.refreshTokenSecret',
      ),
      jsonWebTokenOptions: {
        audience: configService.getOrThrow<string>('auth.jwt.tokenAudience'),
        issuer: configService.getOrThrow<string>('auth.jwt.tokenIssuer'),
        maxAge: configService.getOrThrow<string>('auth.jwt.refreshTokenTtl'),
      },
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request): Promise<JwtPayload> {
    const refreshToken = (req?.cookies as Record<string, string>)?.[
      'refresh_token'
    ];
    const deviceId = (req?.cookies as Record<string, string>)?.['device_id'];

    return await this.jwtAuthService.validateRefreshToken(
      refreshToken,
      deviceId,
    );
  }
}
