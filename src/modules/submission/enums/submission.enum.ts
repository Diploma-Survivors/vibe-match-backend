export enum SubmissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export const judge0StatusMap: Record<number, SubmissionStatus> = {
  1: SubmissionStatus.PENDING,
  2: SubmissionStatus.RUNNING,
  3: SubmissionStatus.ACCEPTED,
  4: SubmissionStatus.WRONG_ANSWER,
  5: SubmissionStatus.TIME_LIMIT_EXCEEDED,
  6: SubmissionStatus.COMPILATION_ERROR,
  7: SubmissionStatus.RUNTIME_ERROR,
  8: SubmissionStatus.RUNTIME_ERROR,
  9: SubmissionStatus.RUNTIME_ERROR,
  10: SubmissionStatus.RUNTIME_ERROR,
  11: SubmissionStatus.RUNTIME_ERROR,
  12: SubmissionStatus.RUNTIME_ERROR,
  13: SubmissionStatus.UNKNOWN_ERROR,
  14: SubmissionStatus.UNKNOWN_ERROR,
  15: SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
};
