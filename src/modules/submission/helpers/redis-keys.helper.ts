import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisKeys {
  private readonly prefix = 'judge:sub';

  meta(submissionId: string) {
    return `${this.prefix}:{${submissionId}}:meta`;
  }

  resultsByIndex(submissionId: string) {
    return `${this.prefix}:{${submissionId}}:resultsI`;
  }

  // handled token
  seen(submissionId: string) {
    return `${this.prefix}:{${submissionId}}:seen`;
  }

  /** A short-lived lock to ensure finalize runs once */
  doneLock(submissionId: string) {
    return `${this.prefix}:{${submissionId}}:done:lock`;
  }
}
