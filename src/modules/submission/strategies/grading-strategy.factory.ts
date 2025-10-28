import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStrategyEnum } from '../enums/submission-strategy.enum';
import { IGradingStrategy } from './interfaces/grading-strategy.interface';
import { SingleSubmissionStrategy } from './single-submission.strategy';
import { BestScoreStrategy } from './best-score.strategy';
import { LatestScoreStrategy } from './latest-score.strategy';
import { AverageScoreStrategy } from './average-score.strategy';

@Injectable()
export class GradingStrategyFactory {
  private readonly logger = new Logger(GradingStrategyFactory.name);

  constructor(
    private readonly singleSubmissionStrategy: SingleSubmissionStrategy,
    private readonly bestScoreStrategy: BestScoreStrategy,
    private readonly latestScoreStrategy: LatestScoreStrategy,
    private readonly averageScoreStrategy: AverageScoreStrategy,
  ) {}

  create(strategyType: SubmissionStrategyEnum): IGradingStrategy {
    this.logger.debug(`Creating strategy: ${strategyType}`);

    switch (strategyType) {
      case SubmissionStrategyEnum.SINGLE_SUBMISSION:
        return this.singleSubmissionStrategy;

      case SubmissionStrategyEnum.BEST_SCORE:
        return this.bestScoreStrategy;

      case SubmissionStrategyEnum.LATEST_SCORE:
        return this.latestScoreStrategy;

      case SubmissionStrategyEnum.AVERAGE_SCORE:
        return this.averageScoreStrategy;

      default:
        this.logger.warn(
          `Unknown strategy: ${String(strategyType)}. Defaulting to BEST_SCORE`,
        );
        return this.bestScoreStrategy;
    }
  }
}
