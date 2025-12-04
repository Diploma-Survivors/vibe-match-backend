import { LtiResourceLinkDto } from '../../dto/lti-resource-link.dto';

export interface DeepLinkingContentStrategy {
  validate(item: LtiResourceLinkDto, courseId: number): Promise<void>;
  buildCustomParams(item: LtiResourceLinkDto): Record<string, any>;
}
