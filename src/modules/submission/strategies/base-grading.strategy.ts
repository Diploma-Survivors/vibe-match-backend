import { Logger } from '@nestjs/common';
import {
  IGradingStrategy,
  StrategyContext,
  StrategyResult,
} from './interfaces/grading-strategy.interface';

export abstract class BaseGradingStrategy implements IGradingStrategy {
  protected readonly logger = new Logger(this.constructor.name);

  async execute(context: StrategyContext): Promise<StrategyResult | null> {
    await this.validateSubmission(context);
    const shouldSend = await this.shouldSendGrade(context);
    if (!shouldSend) {
      this.logger.debug(
        `Strategy ${this.constructor.name}: Skip sending grade for submission ${context.submission.id}`,
      );
      return null;
    }

    const scoreToSend = await this.calculateScore(context);

    const comment = this.getComment(context);

    return {
      shouldSendGrade: true,
      scoreToSend,
      comment,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateSubmission(_context: StrategyContext): Promise<void> {}

  abstract shouldSendGrade(context: StrategyContext): Promise<boolean>;

  abstract calculateScore(context: StrategyContext): Promise<number>;

  getComment(context: StrategyContext): string {
    const { submission, problem } = context;
    const status = submission.status;
    const passedTests = submission.passedTests || 0;
    const totalTests = submission.totalTests || 0;

    return [
      `Status: ${status}`,
      `Tests: ${passedTests}/${totalTests} passed`,
      `Score: ${submission.score}/${problem.maxScore}`,
      `Runtime: ${submission.runtime?.toFixed(3)}s`,
      `Memory: ${submission.memory?.toFixed(2)}KB`,
    ].join('\n');
  }

  protected formatSubmissionInfo(context: StrategyContext): string {
    const { submission } = context;
    return `Submission ${submission.id} (Score: ${submission.score})`;
  }
}
