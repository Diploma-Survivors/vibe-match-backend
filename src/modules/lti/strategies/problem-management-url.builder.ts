// NestJS
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Shared/Common
import { ContentType } from 'src/common/enums/content-type.enum';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { BaseResourceUrlBuilder } from './base-resource-url.builder';

@Injectable()
export class ProblemManagementUrlBuilder extends BaseResourceUrlBuilder {
  readonly type = ContentType.PROBLEM_MANAGEMENT;

  constructor(configService: ConfigService) {
    super(configService);
  }

  buildRedirectUrl(roles: RoleEnum[]): string {
    if (!this.isInstructor(roles)) {
      throw new BadRequestException(
        'You do not have permission to access this resource',
      );
    }

    return this.configService.getOrThrow<string>(
      'lti.frontendProblemUrl.instructor',
    );
  }
}
