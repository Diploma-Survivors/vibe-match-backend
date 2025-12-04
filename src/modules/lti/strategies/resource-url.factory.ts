// NestJS
import { Inject, Injectable } from '@nestjs/common';

// Relative imports
import { ContentType } from 'src/common/enums/content-type.enum';
import {
  BaseResourceUrlBuilder,
  RESOURCE_URL_BUILDER,
} from './base-resource-url.builder';

@Injectable()
export class ResourceUrlFactory {
  private readonly registry: Map<ContentType, BaseResourceUrlBuilder> =
    new Map();

  constructor(
    @Inject(RESOURCE_URL_BUILDER) builders: BaseResourceUrlBuilder[],
  ) {
    for (const builder of builders) {
      this.registry.set(builder.type, builder);
    }
  }

  getBuilder(type: ContentType): BaseResourceUrlBuilder {
    const builder = this.registry.get(type);
    if (!builder) {
      throw new Error(`No builder found for resource type: ${type}`);
    }
    return builder;
  }
}
