// NestJS
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

// Third-party
import KeyvRedis from '@keyv/redis';
import { DataSource, DataSourceOptions } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';

// Relative imports
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DataResponseInterceptor } from './common/interceptors/data-response.interceptor';
import { PaginationModule } from './common/pagination/pagination.module';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import { awsConfig } from './config/aws.config';
import databaseConfig from './config/database.config';
import environmentValidationSchema from './config/environment.validation';
import { judge0Config } from './config/judge0.config';
import { ltiConfig } from './config/lti.config';
import { redisConfig } from './config/redis.config';
import { submissionConfig } from './config/submission.config';
import { AuthModule } from './modules/auth/auth.module';
import { ContestsModule } from './modules/contests/contests.module';
import { CourseModule } from './modules/course/course.module';
import { LanguageModule } from './modules/language/language.module';
import { LtiModule } from './modules/lti/lti.module';
import { ProblemsModule } from './modules/problems/problems.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { UserCourseModule } from './modules/user-course/user-course.module';
import { UserModule } from './modules/user/user.module';
import { RedisModule } from './shared/redis/redis.module';

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
      dataSourceFactory: async (options: DataSourceOptions) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }

        const dataSource = await new DataSource(options).initialize();
        return addTransactionalDataSource(dataSource);
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const username = configService.get<string>('redis.username');
        const password = configService.get<string>('redis.password');
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const db = configService.get<number>('redis.db');
        const authPart = username && password ? `${username}:${password}@` : '';
        const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

        return {
          stores: [new KeyvRedis(redisUrl)],
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute (global default)
      },
    ]),
    PaginationModule,
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
