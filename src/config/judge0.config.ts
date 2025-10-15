import { registerAs } from '@nestjs/config';

export const judge0Config = registerAs('judge0Config', () => ({
  judge0Url: process.env.JUDGE0_URL,
  judge0CallbackUrl: process.env.JUDGE0_CALLBACK_URL,
  apiRapidKey: process.env.RAPIDAPI_KEY,
  apiRapidHost: process.env.RAPIDAPI_HOST,
}));
