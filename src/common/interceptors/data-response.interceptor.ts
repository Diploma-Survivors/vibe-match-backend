import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class DataResponseInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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
