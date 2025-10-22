import { ForbiddenException, Injectable } from '@nestjs/common';
import { BaseGradingStrategy } from './base-grading.strategy';
import { StrategyContext } from './interfaces/grading-strategy.interface';

/**
 *
 * Rules:
 * - Multiple submissions allowed
 * - Always send grade (average of all submissions)
 * - Average includes current submission
 */
@Injectable()
export class AverageScoreStrategy extends BaseGradingStrategy {
  // eslint-disable-next-line @typescript-eslint/require-await
  async validateSubmission(context: StrategyContext): Promise<void> {
    const { previousSubmissions, problem } = context;

    if (problem.maxAttempts) {
      if (previousSubmissions.length >= problem.maxAttempts) {
        throw new ForbiddenException(
          `Maximum ${problem.maxAttempts} attempts exceeded for this problem.`,
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async shouldSendGrade(): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async calculateScore(context: StrategyContext): Promise<number> {
    const { submission, previousSubmissions } = context;

    const allScores = [
      ...previousSubmissions.map((s) => s.score),
      submission.score,
    ];

    const sum = allScores.reduce((total, score) => total + score, 0);
    const average = sum / allScores.length;

    return Math.round(average * 100) / 100;
  }

  getComment(context: StrategyContext): string {
    const { submission, previousSubmissions, problem } = context;
    const attemptNumber = previousSubmissions.length + 1;

    const allScores = [
      ...previousSubmissions.map((s) => s.score),
      submission.score,
    ];

    const sum = allScores.reduce((total, score) => total + score, 0);
    const average = Math.round((sum / allScores.length) * 100) / 100;
    const baseComment = super.getComment(context);

    return [
      `[Average Score Mode - Attempt ${attemptNumber}]`,
      `All scores: [${allScores.join(', ')}]`,
      `Average: ${average}/${problem.maxScore}`,
      '',
      baseComment,
    ].join('\n');
  }
}
