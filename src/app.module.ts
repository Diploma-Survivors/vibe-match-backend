import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DataResponseInterceptor } from './common/interceptors/data-response.interceptor';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import { awsConfig } from './config/aws.config';
import databaseConfig from './config/database.config';
import environmentValidationSchema from './config/environment.validation';
import { ltiConfig } from './config/lti.config';
import { redisConfig } from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { ContestsModule } from './modules/contests/contests.module';
import { CourseModule } from './modules/course/course.module';
import { LtiModule } from './modules/lti/lti.module';
import { ProblemsModule } from './modules/problems/problems.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { UserCourseModule } from './modules/user-course/user-course.module';
import { UserModule } from './modules/user/user.module';
import { RedisModule } from './shared/redis/redis.module';
import { LanguageModule } from './modules/language/language.module';
import { submissionConfig } from './config/submission.config';
import { judge0Config } from './config/judge0.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        ltiConfig,
        authConfig,
        awsConfig,
        submissionConfig,
        judge0Config,
      ],
      validationSchema: environmentValidationSchema,
      isGlobal: true,
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
    RedisModule,
    CourseModule,
    UserCourseModule,
    ProblemsModule,
    ContestsModule,
    SubmissionModule,
    LanguageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: DataResponseInterceptor },
  ],
})
export class AppModule {}
