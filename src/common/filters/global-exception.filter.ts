import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      this.handleHttpException(exception, request, response);
    } else {
      this.handleSystemException(exception, request, response);
    }
  }

  private handleHttpException(
    exception: HttpException,
    request: Request,
    response: Response,
  ) {
    const status = exception.getStatus();
    const message = exception.message;
    const errorResponse = exception.getResponse() as Record<string, unknown>;

    this.logHttpException(exception, request);

    response.status(status).json({
      statusCode: status,
      message: message,
      error: errorResponse?.message || errorResponse,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handleSystemException(
    exception: unknown,
    request: Request,
    response: Response,
  ) {
    this.logSystemException(exception, request);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error:
        this.configService.get('appConfig.environment') === 'development'
          ? (exception as Error).message
          : 'Something went wrong',
      cause:
        this.configService.get('appConfig.environment') === 'development'
          ? (exception as Error).stack
          : undefined,
    });
  }

  private logHttpException(
    exception: HttpException,
    request: Request,
    cause?: Error,
    options?: Record<string, unknown>,
  ) {
    this.logger.error(
      `HTTP Exception: ${exception.message}`,
      {
        statusCode: exception.getStatus(),
        path: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        ...options,
      },
      cause,
    );
  }

  private logSystemException(exception: unknown, request: Request) {
    this.logger.error(`System Exception: ${(exception as Error).message}`, {
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      stack: (exception as Error).stack,
    });
  }
}
