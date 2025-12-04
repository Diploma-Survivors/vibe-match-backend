// NestJS
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Relative imports
import { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { RedisService } from 'src/shared/redis/redis.service';
import { LTI_ROLES, LTI_VERSIONS } from '../../constants/lti.constants';
import { LTI_DEEP_LINKING_PREFIX } from '../../constants/redis.constants';
import { LtiDeepLinkingRequestDto } from '../../dto/lti-deep-linking-request.dto';
import { LtiDeepLinkingJwtPayloadDto } from '../../dto/lti-deep-linking-response.dto';
import { LtiResourceLinkDto } from '../../dto/lti-resource-link.dto';
import { ContentItemType } from '../../enums/content-item-type.enum';
import { LtiMessageType } from '../../enums/lti-message-type.enum';
import { LtiLaunchResponse } from '../../interfaces/lti.interface';
import { KeysService } from '../../keys.service';
import { LtiUtilService } from '../../lti-util.service';
import { DeepLinkingContentStrategyFactory } from '../deep-linking-content/deep-linking-content.factory';
import { DeepLinkingStrategy } from './deep-linking.strategy';

const LTI_DEEP_LINKING_TIMEOUT_MS = 60 * 60 * 1000;

@Injectable()
export class DefaultDeepLinkingStrategy implements DeepLinkingStrategy {
  private readonly logger = new Logger(DefaultDeepLinkingStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly keysService: KeysService,
    private readonly deepLinkingContentStrategyFactory: DeepLinkingContentStrategyFactory,
    private readonly ltiUtilService: LtiUtilService,
  ) {}

  public async handleRequest(
    ltiDeepLinkingDto: LtiDeepLinkingRequestDto,
  ): Promise<LtiLaunchResponse> {
    const nonce = await this.ltiUtilService.validateAndGetNonceFromState(
      ltiDeepLinkingDto.state,
    );

    const claims = await this.ltiUtilService.getAndValidateClaims(
      ltiDeepLinkingDto.idToken,
      LtiMessageType.LTI_DEEP_LINKING_REQUEST,
      nonce,
    );

    const clientId = this.configService.get<string>('lti.clientId');

    if (claims.azp && claims.azp !== clientId) {
      throw new UnauthorizedException('Invalid authorized party (azp) claim');
    }

    if (!claims.roles.includes(LTI_ROLES.INSTRUCTOR)) {
      throw new UnauthorizedException(
        'User does not have instructor role required for deep linking',
      );
    }

    const user = await this.ltiUtilService.upsertUserFromClaims(claims);
    const course = await this.ltiUtilService.processCourseAndEnrollUser(
      claims,
      user,
    );
    const tokens = await this.ltiUtilService.issueTokens(user, claims, course);

    const deepLinkingSettings = claims.deepLinkingSettings;
    const isAcceptLtiResourceLink = deepLinkingSettings.acceptTypes?.includes(
      ContentItemType.LTI_RESOURCE_LINK,
    );
    if (!isAcceptLtiResourceLink) {
      throw new BadRequestException(
        'LTI platform does not accept LTI Resource Link content items',
      );
    }

    const deepLinkingData = {
      deepLinkReturnUrl: deepLinkingSettings.deepLinkReturnUrl,
      data: deepLinkingSettings?.data,
      nonce,
      azp: claims?.azp,
    };
    this.logger.log(
      `Storing deep linking data for deviceId ${
        tokens.deviceId
      }: ${JSON.stringify(deepLinkingData)}`,
    );

    const keyRedis = `${LTI_DEEP_LINKING_PREFIX}${tokens.deviceId}`;
    await this.redisService.set(keyRedis, JSON.stringify(deepLinkingData));

    setTimeout(() => {
      (async () => {
        const deepLinkingData = await this.redisService.get(keyRedis);
        if (deepLinkingData) {
          // When timeout, we should send an empty response
          await this.handleResponse(
            null as unknown as LtiResourceLinkDto,
            {
              sub: user.id.toString(),
              courseId: course?.id,
            } as JwtPayload,
            tokens.deviceId,
          );
        }
      })().catch((error) => {
        this.logger.error(
          `Deep linking timeout handler failed: ${(error as Error).message}`,
        );
      });
    }, LTI_DEEP_LINKING_TIMEOUT_MS);

    const redirectPath = this.configService.get<string>(
      'lti.frontendSelectContentUrl',
    ) as string;

    const postRedirectUrl = this.configService.get<string>(
      'lti.frontendSetCookiesUrl.instructor',
    ) as string;

    return {
      ...tokens,
      redirectPath,
      postRedirectUrl,
    };
  }

  public async handleResponse(
    ltiResourceLinkDto: LtiResourceLinkDto,
    user: JwtPayload,
    deviceId: string,
  ): Promise<{ jwt: string; deepLinkReturnUrl: string }> {
    let ltiResourceLinks: LtiResourceLinkDto[] = [];
    if (ltiResourceLinkDto && ltiResourceLinkDto.contentType) {
      const contentStrategy =
        this.deepLinkingContentStrategyFactory.getStrategy(
          ltiResourceLinkDto.contentType,
        );

      await contentStrategy.validate(ltiResourceLinkDto, user.courseId!);
      const customParams =
        contentStrategy.buildCustomParams(ltiResourceLinkDto);

      const redirectUrl = this.configService.get<string>(
        'lti.toolRedirectionUri',
      );

      ltiResourceLinks = [
        new LtiResourceLinkDto({
          ...ltiResourceLinkDto,
          type: ContentItemType.LTI_RESOURCE_LINK,
          url: redirectUrl,
          custom: customParams,
        }),
      ];
    }

    const keyRedis = `${LTI_DEEP_LINKING_PREFIX}${deviceId}`;
    const deepLinkingDataString = await this.redisService.get(keyRedis);
    if (!deepLinkingDataString) {
      throw new BadRequestException(
        'Deep linking session not found or expired',
      );
    }
    await this.redisService.del(keyRedis);

    const deepLinkingData = JSON.parse(deepLinkingDataString) as {
      deepLinkReturnUrl: string;
      data?: string;
      nonce: string;
      azp?: string;
    };
    this.logger.debug(`Deep Linking Data from Redis: ${deepLinkingDataString}`);

    const clientId = this.configService.get<string>('lti.clientId');
    const platformId = this.configService.get<string>('lti.platformId');
    const deploymentId = this.configService.get<string>('lti.deploymentId');

    const jwtPayload = new LtiDeepLinkingJwtPayloadDto({
      iss: clientId,
      aud: platformId,
      nonce: deepLinkingData.nonce,
      azp: deepLinkingData?.azp,
      messageType: LtiMessageType.LTI_DEEP_LINKING_RESPONSE,
      version: LTI_VERSIONS.V1_3,
      deploymentId,
      data: deepLinkingData?.data,
      contentItems: ltiResourceLinks,
    });

    const jwt = await this.keysService.generateDeepLinkingJwt(jwtPayload);

    const deepLinkAuthData = {
      jwt,
      deepLinkReturnUrl: deepLinkingData.deepLinkReturnUrl,
    };
    this.logger.debug(
      `Deep Linking Response result: ${JSON.stringify(deepLinkAuthData)}`,
    );

    return deepLinkAuthData;
  }
}
