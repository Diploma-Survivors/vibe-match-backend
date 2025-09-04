import { registerAs } from '@nestjs/config';

export const awss3Config = registerAs('awss3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
}));
