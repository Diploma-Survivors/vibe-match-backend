import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ConfigService } from '@nestjs/config';
import { SKIP_DATA_RESPONSE } from './skip-data-response.interceptor';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DataResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.get<boolean>(
      SKIP_DATA_RESPONSE,
      context.getHandler(),
    );
    if (skip) {
      return next.handle(); // bypass interceptor
    }

    // After Controller
    return next.handle().pipe(
      map((data: unknown) => ({
        status: 'OK',
        apiVersion: this.configService.get('appConfig.apiVersion') as string,
        data: data,
      })),
    );
  }
}
