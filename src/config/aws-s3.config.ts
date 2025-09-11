import { registerAs } from '@nestjs/config';

export const awsS3Config = registerAs('awsS3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
}));
