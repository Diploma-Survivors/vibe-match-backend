// NestJS
import { BadRequestException, Injectable } from '@nestjs/common';

// Shared/Common
import { ContentType } from 'src/common/enums/content-type.enum';

// Relative imports
import { ContestsService } from 'src/modules/contests/contests.service';
import { LtiResourceLinkDto } from '../../dto/lti-resource-link.dto';
import { DeepLinkingContentStrategy } from './deep-linking-content.strategy';

@Injectable()
export class ContestContentStrategy implements DeepLinkingContentStrategy {
  constructor(private readonly contestsService: ContestsService) {}

  public async validate(
    item: LtiResourceLinkDto,
    courseId: number,
  ): Promise<void> {
    if (!item?.custom?.contestId) {
      throw new BadRequestException('Contest ID is missing');
    }

    const contest = await this.contestsService.findOne({
      id: item.custom.contestId as number,
    });

    if (!contest) {
      throw new BadRequestException('Contest not found');
    }

    if (contest.courseId !== courseId) {
      throw new BadRequestException('Contest does not belong to this course');
    }
  }

  public buildCustomParams(item: LtiResourceLinkDto): Record<string, unknown> {
    return {
      contestId: item?.custom?.contestId,
      contentType: ContentType.CONTEST,
    };
  }
}
