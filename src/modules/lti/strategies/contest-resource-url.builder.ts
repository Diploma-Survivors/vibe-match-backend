// NestJS
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Shared/Common
import { ContentType } from 'src/common/enums/content-type.enum';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { BaseResourceUrlBuilder } from './base-resource-url.builder';

@Injectable()
export class ContestResourceUrlBuilder extends BaseResourceUrlBuilder {
  readonly type = ContentType.CONTEST;

  constructor(configService: ConfigService) {
    super(configService);
  }

  buildRedirectUrl(roles: RoleEnum[], customParams: unknown): string {
    let baseUrl = '';

    if (this.isInstructor(roles)) {
      baseUrl = this.configService.getOrThrow<string>(
        'lti.frontendContestUrl.instructor',
      );
    } else {
      baseUrl = this.configService.getOrThrow<string>(
        'lti.frontendContestUrl.student',
      );
    }

    return baseUrl.replace('{{CONTENT_ID}}', customParams?.['contestId']);
  }
}
