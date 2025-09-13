import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  accessTokenTtl: number;
  refreshTokenSecret: string;
  refreshTokenTtl: number;
  tokenAudience: string;
  tokenIssuer: string;
}

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET as string,
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL || '3600', 10),
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET as string,
    refreshTokenTtl: parseInt(
      process.env.JWT_REFRESH_TOKEN_TTL || '604800',
      10,
    ),
    tokenAudience: process.env.JWT_TOKEN_AUDIENCE as string,
    tokenIssuer: process.env.JWT_TOKEN_ISSUER as string,
  } as JwtConfig,
}));
