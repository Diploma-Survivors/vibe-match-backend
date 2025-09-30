import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT_KEY } from '../decorators/env.decorator';

@Injectable()
export class EnvironmentGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const allowedEnv = this.reflector.getAllAndOverride<string[]>(
      ENVIRONMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedEnv || allowedEnv.length === 0) {
      return true;
    }

    const currentEnv = this.configService.getOrThrow<string>(
      'appConfig.environment',
    );
    if (!allowedEnv.includes(currentEnv)) {
      throw new NotFoundException();
    }

    return true;
  }
}
