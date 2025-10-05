import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt.interface';
import { JwtAuthService } from '../jwt-auth.service';

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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    const refreshToken = (req.headers?.authorization as string)?.split(' ')[1];
    const deviceId = (req?.body as Record<string, string>)?.['deviceId'];

    return await this.jwtAuthService.validateRefreshToken(
      refreshToken,
      deviceId,
    );
  }
}
