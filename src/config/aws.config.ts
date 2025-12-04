import { registerAs } from '@nestjs/config';

export const awsConfig = registerAs('aws', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3: {
    region: process.env.AWS_S3_REGION,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    presignedUrlExpiresIn: Number.parseInt(
      process.env.AWS_S3_PRESIGNED_URL_EXPIRES_IN!,
    ),
  },
}));
