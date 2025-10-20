import { ForbiddenException, Injectable } from '@nestjs/common';
import { BaseGradingStrategy } from './base-grading.strategy';
import { StrategyContext } from './interfaces/grading-strategy.interface';

/**
 *
 * Rules:
 * - Multiple submissions allowed
 * - Always send the latest submission's score
 * - Overwrites previous grade in Moodle (even if lower)
 */
@Injectable()
export class LatestScoreStrategy extends BaseGradingStrategy {

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
    return true;
  }


  async calculateScore(context: StrategyContext): Promise<number> {
    return context.submission.score;
  }

  async getComment(context: StrategyContext): Promise<string> {
    const { previousSubmissions } = context;
    const attemptNumber = previousSubmissions.length + 1;
    const baseComment = await super.getComment(context);

    let previousScoresInfo = '';
    if (previousSubmissions.length > 0) {
      const previousScores = previousSubmissions.map((s) => s.score).join(', ');
      previousScoresInfo = `Previous scores: [${previousScores}]\n`;
    }

    return [
      `[Latest Score Mode - Attempt ${attemptNumber}]`,
      previousScoresInfo,
      baseComment,
    ].join('\n');
  }
}

