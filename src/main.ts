// Built-in
import { Response } from 'express';

// NestJS
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Third-party
import cookieParser from 'cookie-parser';
import qs, { ParsedQs } from 'qs';
import {
  initializeTransactionalContext,
  StorageDriver,
} from 'typeorm-transactional';

// Relative imports
import { AppModule } from './app.module';
import { Environment } from './common/enums/environment.enum';
import { ExpressSetting } from './common/enums/express-setting.enum';

async function bootstrap() {
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  app.set(
    ExpressSetting.QUERY_PARSER,
    (str: string): ParsedQs =>
      qs.parse(str, { allowPrototypes: false, allowDots: true }),
  );

  // Global prefix
  const apiVersion =
    (configService.get('appConfig.apiVersion') as string) || 'v1';
  app.setGlobalPrefix(apiVersion);

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: configService.get<string>('appConfig.cors'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle(
      (configService.get('appConfig.swaggerTitle') as string) ||
        'Vibe Match API',
    )
    .setDescription(
      (configService.get('appConfig.swaggerDescription') as string) ||
        'API documentation for Vibe Match backend',
    )
    .setVersion(
      (configService.get('appConfig.swaggerVersion') as string) || '1.0',
    )
    .addBearerAuth()
    .build();

  const swaggerEndpoint = configService.get(
    'appConfig.swaggerEndpoint',
  ) as string;

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerEndpoint, app, document);

  const env = configService.get<string>('appConfig.environment');
  if (env !== Environment.PRODUCTION) {
    app
      .getHttpAdapter()
      .get(`/${apiVersion}/swagger-json`, (_req, res: Response) => {
        res.json(document);
      });
  }

  const port = (configService.get('appConfig.port') as number) || 3000;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}`);
  Logger.log(
    `Swagger documentation: http://localhost:${port}/${swaggerEndpoint}`,
  );
  Logger.log(
    `You can use http://localhost:${port}/${apiVersion}/swagger-json to import the swagger document`,
  );
}
void bootstrap();
