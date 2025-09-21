import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SKIP_TRANSFORM_RESPONSE } from '../decorators/skip-transform.decorator';

@Injectable()
export class DataResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_RESPONSE,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return next.handle();
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
