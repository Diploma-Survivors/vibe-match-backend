import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth } from './entities/auth.entity';
import { JwtAuthService } from './jwt-auth.service';
import { UserModule } from '../user/user.module';
import { RefreshTokenModule } from './refresh-token.module';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy';
import { RedisModule } from 'src/shared/redis/redis.module';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Auth]),
    UserModule,
    RefreshTokenModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwt.secret') as string,
        signOptions: {
          expiresIn: configService.get<number>(
            'auth.jwt.accessTokenTtl',
          ) as number,
          audience: configService.get<string>(
            'auth.jwt.tokenAudience',
          ) as string,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthService,
    Logger,
    JwtAuthStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService, JwtAuthService, JwtAuthStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
