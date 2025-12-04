// NestJS
import { Injectable } from '@nestjs/common';

// Shared/Common
import { ContentType } from 'src/common/enums/content-type.enum';

// Relative imports
import { ContestContentStrategy } from './contest-content.strategy';
import { DeepLinkingContentStrategy } from './deep-linking-content.strategy';
import { ProblemManagementContentStrategy } from './problem-management-content.strategy';

@Injectable()
export class DeepLinkingContentStrategyFactory {
  constructor(
    private readonly contestContentStrategy: ContestContentStrategy,
    private readonly problemManagementContentStrategy: ProblemManagementContentStrategy,
  ) {}

  getStrategy(contentType: ContentType): DeepLinkingContentStrategy {
    switch (contentType) {
      case ContentType.CONTEST:
        return this.contestContentStrategy;
      case ContentType.PROBLEM_MANAGEMENT:
        return this.problemManagementContentStrategy;
      default:
        throw new Error(`Unsupported content type: ${contentType as string}`);
    }
  }
}
