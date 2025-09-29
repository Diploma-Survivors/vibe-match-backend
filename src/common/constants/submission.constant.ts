export const SUBMISSION_EVENT_REDIS_CHANNEL = 'submissions-events';
export const SUBMISSION_CLEANUP_STREAM_TIME = 60 * 1000; // 60s
export const SUBMISSION_PING_EVENT = 'ping';
export const SUBMISSION_PING_DATA = '\n\n';
export const SUBMISSION_PING_TIME = 3 * 1000; // 3s
export const SUBMISSION_RESULT_EVENT = 'result';
export const SUBMISSION_REPLAY_SUBJECT_BUFFER = 1;
export const QUEUE_FINALIZE_RUN_JOB = 'finalize.run';
export const QUEUE_FINALIZE_SUBMIT_JOB = 'finalize.submit';
export const JOB_ATTEMPTS = 5;
export const JOB_BACKOFF = {
  type: 'exponential',
  delay: 1000,
};
export const JOB_REMOVE_ON_COMPLETE = true;
export const JOB_REMOVE_ON_FAIL = 50;
export const SUBMISSION_FILE_EXTENSION = 'zip';
