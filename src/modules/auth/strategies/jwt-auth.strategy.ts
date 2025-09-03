import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
      jsonWebTokenOptions: {
        audience: configService.getOrThrow<string>('jwt.audience'),
        issuer: configService.getOrThrow<string>('jwt.issuer'),
        maxAge: configService.getOrThrow<string>('jwt.accessTokenTtl'),
      },
      ignoreExpiration: false,
    });
  }

  validate(tokenPayload: JwtPayload) {
    return tokenPayload;
  }
}
