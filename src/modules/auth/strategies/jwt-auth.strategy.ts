import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt.interface';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('auth.jwt.secret'),
      jsonWebTokenOptions: {
        audience: configService.getOrThrow<string>('auth.jwt.tokenAudience'),
        issuer: configService.getOrThrow<string>('auth.jwt.tokenIssuer'),
        maxAge: configService.getOrThrow<string>('auth.jwt.accessTokenTtl'),
      },
      ignoreExpiration: false,
    });
  }

  validate(tokenPayload: JwtPayload) {
    return tokenPayload;
  }
}
