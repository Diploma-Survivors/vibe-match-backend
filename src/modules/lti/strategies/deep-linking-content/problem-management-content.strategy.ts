// NestJS
import { Injectable } from '@nestjs/common';

// Shared/Common
import { ContentType } from 'src/common/enums/content-type.enum';

// Relative imports
import { DeepLinkingContentStrategy } from './deep-linking-content.strategy';

@Injectable()
export class ProblemManagementContentStrategy
  implements DeepLinkingContentStrategy
{
  constructor() {}

  public async validate(): Promise<void> {
    return Promise.resolve();
  }

  public buildCustomParams(): Record<string, any> {
    return {
      contentType: ContentType.PROBLEM_MANAGEMENT,
    };
  }
}
