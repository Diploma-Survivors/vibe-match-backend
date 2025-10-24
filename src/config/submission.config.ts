import { registerAs } from '@nestjs/config';

export const submissionConfig = registerAs('submission', () => ({
  cleanupStreamTime: parseInt(
    process.env.SUBMISSION_CLEANUP_STREAM_TIME ?? '60000',
    10,
  ),
  pingTime: parseInt(process.env.SUBMISSION_PING_TIME ?? '3000', 10),
  job: {
    attempts: parseInt(process.env.JOB_ATTEMPTS ?? '5', 10),
    backoff: {
      type: (process.env.JOB_BACKOFF_TYPE ?? 'exponential') as
        | 'exponential'
        | 'fixed',
      delay: parseInt(process.env.JOB_BACKOFF_DELAY ?? '1000', 10),
    },
    removeOnComplete: process.env.JOB_REMOVE_ON_COMPLETE === 'true',
    removeOnFail: parseInt(process.env.JOB_REMOVE_ON_FAIL ?? '50', 10),
  },
  useAWS: process.env.USE_AWS,
}));
