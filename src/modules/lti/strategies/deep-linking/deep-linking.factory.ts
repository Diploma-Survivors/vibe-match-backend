// NestJS
import { Injectable } from '@nestjs/common';

// Relative imports
import { DeepLinkingStrategy } from './deep-linking.strategy';
import { DefaultDeepLinkingStrategy } from './default-deep-linking.strategy';

@Injectable()
export class DeepLinkingFactory {
  constructor(private readonly defaultStrategy: DefaultDeepLinkingStrategy) {}

  getStrategy(): DeepLinkingStrategy {
    // In the future, we could have logic here to select a strategy based on LTI version, platform, etc.
    return this.defaultStrategy;
  }
}
