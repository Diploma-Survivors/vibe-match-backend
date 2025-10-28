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
    return this.computeAverage(context);
  }

  getComment(context: StrategyContext): string {
    const { previousSubmissions, problem } = context;
    const attemptNumber = previousSubmissions.length + 1;

    const allScores = this.getAllScores(context);
    const average = this.computeAverage(context);
    const baseComment = super.getComment(context);

    return [
      `[Average Score Mode - Attempt ${attemptNumber}]`,
      `All scores: [${allScores.join(', ')}]`,
      `Average: ${average}/${problem.maxScore}`,
      '',
      baseComment,
    ].join('\n');
  }

  private getAllScores(context: StrategyContext): number[] {
    const { submission, previousSubmissions } = context;
    return [...previousSubmissions.map((s) => s.score), submission.score];
  }

  private computeAverage(context: StrategyContext): number {
    const allScores = this.getAllScores(context);
    const sum = allScores.reduce((total, score) => total + score, 0);
    const average = sum / allScores.length;
    return Math.round(average * 100) / 100;
  }
}
