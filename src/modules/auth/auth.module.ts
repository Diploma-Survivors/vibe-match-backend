import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from 'src/shared/redis/redis.module';

import { Course } from '../course/entities/course.entity';
import { UserCourse } from '../user-course/entities/user-course.entity';
import { UserCourseModule } from '../user-course/user-course.module';
import { Tenant } from '../user/entities/tenant.entity';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth } from './entities/auth.entity';
import { JwtAuthService } from './jwt-auth.service';
import { RefreshTokenModule } from './refresh-token.module';
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Auth, Tenant, Course, UserCourse]),
    UserModule,
    UserCourseModule,
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
