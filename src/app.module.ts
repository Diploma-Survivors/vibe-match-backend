import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import environmentValidation from './config/environment.validation';
import redisConfig from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { LtiModule } from './modules/lti/lti.module';
import { ltiConfig } from './config/lti.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, ltiConfig],
      validationSchema: environmentValidation,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        ...(configService.get('database') as Record<string, unknown>),
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        ...(configService.get('redis') as Record<string, unknown>),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    LtiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
