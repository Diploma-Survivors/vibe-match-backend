import { SetMetadata } from '@nestjs/common';

export const ENVIRONMENT_KEY = Symbol('Environment');
export const EnvGuard = (...envs: string[]) =>
  SetMetadata(ENVIRONMENT_KEY, envs);
