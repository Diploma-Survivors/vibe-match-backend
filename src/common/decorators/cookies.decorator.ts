import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const Cookies = createParamDecorator(
  (cookieName: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (!cookieName) {
      return request.cookies as Record<string, string | undefined>;
    }

    return (request.cookies as Record<string, string | undefined>)[cookieName];
  },
);
