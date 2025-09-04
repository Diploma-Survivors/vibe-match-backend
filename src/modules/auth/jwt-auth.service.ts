import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt.interface';

@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public generateJwt(payload: JwtPayload): string {
    const accessTokenTtl = this.configService.get<number>(
      'JWT_ACCESS_TOKEN_TTL',
    ) as number;
    return this.jwtService.sign(payload, { expiresIn: accessTokenTtl });
  }

  public async verifyJwt(token: string): Promise<JwtPayload> {
    return this.jwtService.verify(token);
  }
}
