import { ForbiddenException, Injectable } from '@nestjs/common';
import { BaseGradingStrategy } from './base-grading.strategy';
import { StrategyContext } from './interfaces/grading-strategy.interface';

/**
 *
 * Rules:
 * - Multiple submissions allowed
 * - Only send grade if current score > previous best score
 * - Prevents sending lower scores to Moodle
 */
@Injectable()
export class BestScoreStrategy extends BaseGradingStrategy {

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

  async shouldSendGrade(context: StrategyContext): Promise<boolean> {
    const { submission, previousSubmissions } = context;

    if (previousSubmissions.length === 0) {
      this.logger.debug(`First submission - sending grade`);
      return true;
    }

    const bestPreviousScore = Math.max(
      ...previousSubmissions.map((s) => s.score),
      0,
    );

    const shouldSend = submission.score > bestPreviousScore;

    if (!shouldSend) {
      this.logger.debug(
        `Current score ${submission.score} <= best score ${bestPreviousScore}. Skip sending.`,
      );
    }

    return shouldSend;
  }

  async calculateScore(context: StrategyContext): Promise<number> {
    return context.submission.score;
  }


  async getComment(context: StrategyContext): Promise<string> {
    const { submission, previousSubmissions, problem } = context;
    const attemptNumber = previousSubmissions.length + 1;
    const baseComment = await super.getComment(context);

    return [
      `[Best Score Mode - Attempt ${attemptNumber}]`,
      `Best Score: ${submission.score}/${problem.maxScore}`,
      '',
      baseComment,
    ].join('\n');
  }
}

