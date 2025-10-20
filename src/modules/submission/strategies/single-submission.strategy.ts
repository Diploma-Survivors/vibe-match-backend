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

  async validateSubmission(context: StrategyContext): Promise<void> {
    const { previousSubmissions, problem } = context;

    const maxAttempts = problem.maxAttempts ?? 1;

    if (previousSubmissions.length >= maxAttempts) {
      throw new ForbiddenException(
        `You have already submitted a solution. Only ${maxAttempts} submission is allowed for this problem.`,
      );
    }
  }

  async shouldSendGrade(context: StrategyContext): Promise<boolean> {
    return true;
  }


  async calculateScore(context: StrategyContext): Promise<number> {
    return context.submission.score;
  }

  async getComment(context: StrategyContext): Promise<string> {
    const baseComment = await super.getComment(context);
    return `[Single Submission Mode]\n${baseComment}`;
  }
}

