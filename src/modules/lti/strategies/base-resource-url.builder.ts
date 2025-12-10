// NestJS
import { ConfigService } from '@nestjs/config';

// Shared/Common
import { ContentType } from 'src/common/enums/content-type.enum';
import { RoleEnum } from 'src/modules/user/enums/role.enum';

export const RESOURCE_URL_BUILDER = 'RESOURCE_URL_BUILDER';

export abstract class BaseResourceUrlBuilder {
  abstract readonly type: ContentType;

  constructor(protected readonly configService: ConfigService) {}

  abstract buildRedirectUrl(roles: RoleEnum[], customParams: unknown): string;

  buildSetCookiesUrl(roles: RoleEnum[]): string {
    if (this.isInstructor(roles)) {
      return this.configService.getOrThrow<string>(
        'lti.frontendSetCookiesUrl.instructor',
      );
    } else if (this.isStudent(roles)) {
      return this.configService.getOrThrow<string>(
        'lti.frontendSetCookiesUrl.student',
      );
    }
    throw new Error('User role not recognized for setting cookies URL');
  }

  protected isInstructor(roles: RoleEnum[]): boolean {
    return roles.includes(RoleEnum.INSTRUCTOR);
  }

  protected isStudent(roles: RoleEnum[]): boolean {
    return roles.includes(RoleEnum.STUDENT);
  }
}
