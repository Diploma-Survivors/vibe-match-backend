import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth } from './entities/auth.entity';
import { JwtAuthService } from './jwt-auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt-auth.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Auth]),
    UserModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') as string,
        signOptions: {
          expiresIn: configService.get<number>('jwt.accessTokenTtl') as number,
          audience: configService.get<string>('jwt.audience') as string,
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthService, JwtStrategy],
  exports: [AuthService, JwtAuthService, JwtStrategy],
})
export class AuthModule {}
