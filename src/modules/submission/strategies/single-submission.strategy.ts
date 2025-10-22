import { ForbiddenException, Injectable } from '@nestjs/common';
import { BaseGradingStrategy } from './base-grading.strategy';
import { StrategyContext } from './interfaces/grading-strategy.interface';

/**
 * Rules:
 * - Only ONE submission allowed per user-problem-session
 * - Throws error if already submitted
 * - Always sends grade (since only one submission exists)
 */
@Injectable()
export class SingleSubmissionStrategy extends BaseGradingStrategy {
  // eslint-disable-next-line @typescript-eslint/require-await
  async validateSubmission(context: StrategyContext): Promise<void> {
    const { previousSubmissions, problem } = context;

    const maxAttempts = problem.maxAttempts ?? 1;

    if (previousSubmissions.length >= maxAttempts) {
      throw new ForbiddenException(
        `You have already submitted a solution. Only ${maxAttempts} submission is allowed for this problem.`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async shouldSendGrade(): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async calculateScore(context: StrategyContext): Promise<number> {
    return context.submission.score;
  }

  getComment(context: StrategyContext): string {
    const baseComment = super.getComment(context);
    return `[Single Submission Mode]\n${baseComment}`;
  }
}
