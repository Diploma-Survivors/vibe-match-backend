export enum SubmissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  SIGSEGV = 'SIGSEGV',
  SIGXFSZ = 'SIGXFSZ',
  SIGFPE = 'SIGFPE',
  SIGABRT = 'SIGABRT',
  NZEC = 'NZEC',
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
  7: SubmissionStatus.SIGSEGV, // SIGSEGV (Segmentation fault)
  8: SubmissionStatus.SIGXFSZ, // SIGXFSZ (File size limit exceeded)
  9: SubmissionStatus.SIGFPE, // SIGFPE (Floating point exception)
  10: SubmissionStatus.SIGABRT, // SIGABRT (Abort signal from abort(3))
  11: SubmissionStatus.NZEC, // NZEC (Non-zero exit status)
  12: SubmissionStatus.RUNTIME_ERROR, // Other runtime error
  13: SubmissionStatus.UNKNOWN_ERROR, // Internal Error
  14: SubmissionStatus.UNKNOWN_ERROR, // Exec Format Error
};
