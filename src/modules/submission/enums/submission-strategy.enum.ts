export enum SubmissionStrategyEnum {
  /**
   * Only ONE submission allowed per user-problem
   * Throws error if already submitted
   */
  SINGLE_SUBMISSION = 'SINGLE_SUBMISSION',

  /**
   * Multiple submissions allowed
   * Only send grade if current score > previous best
   * Default strategy
   */
  BEST_SCORE = 'BEST_SCORE',

  /**
   * Multiple submissions allowed
   * Always send latest submission's score (can overwrite with lower score)
   */
  LATEST_SCORE = 'LATEST_SCORE',

  /**
   * Multiple submissions allowed
   * Always send average of all submission scores
   */
  AVERAGE_SCORE = 'AVERAGE_SCORE',
}
