import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import * as crypto from 'crypto';
import * as jose from 'jose';
import {
  LTI_CLAIMS,
  LTI_MESSAGE_TYPES,
  LTI_VERSIONS,
} from './constants/lti.constants';
import {
  LtiClaims,
  LtiContextClaim,
  LtiStatePayload,
  TokenResponse,
} from './interfaces/lti.interface';
import { RedisService } from '../../shared/redis/redis.service';
import { UserService } from '../../modules/user/user.service';
import { JwtAuthService } from '../../modules/auth/jwt-auth.service';
import { RefreshTokenService } from '../../modules/auth/services/refresh-token.service'; // Import RefreshTokenService
import { CourseService } from '../../modules/course/services/course.service';
import { UserCourseService } from '../../modules/user-course/services/user-course.service';

import { Course } from '../course/entities/course.entity';
import { RoleEnum } from '../user/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { LtiDeepLinkingRequestDto } from './dto/lti-deep-linking-request.dto';
import { plainToInstance } from 'class-transformer';
import { IdTokenPayloadDto } from './dto/id-token-payload.dto';
import { validate } from 'class-validator';
import { LtiMessageType } from './enums/lti-message-type.enum';
import { ContentItemType } from './enums/content-item-type.enum';
import { LtiResourceLinkDto } from './dto/lti-resource-link.dto';
import { LtiDeepLinkingJwtPayloadDto } from './dto/lti-deep-linking-response.dto';
import { KeysService } from './keys.service';

const LTI_STATE_TTL_SECONDS = 300;

@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly courseService: CourseService,
    private readonly userCourseService: UserCourseService,
    private readonly keysService: KeysService,
  ) {}

  public async handleLoginInitiation(
    ltiLoginInitiationDto: LtiLoginInitiationDto,
  ): Promise<string> {
    const { iss, loginHint, targetLinkUri, ltiMessageHint } =
      ltiLoginInitiationDto;

    const platformId = this.configService.get<string>(
      'lti.platformId',
    ) as string;
    if (iss !== platformId) {
      throw new BadRequestException('Invalid issuer');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');

    const stateData = {
      nonce,
      targetLinkUri,
      ltiMessageHint,
    } as LtiStatePayload;
    await this.redisService.set(
      `lti:state:${state}`,
      JSON.stringify(stateData),
      LTI_STATE_TTL_SECONDS * 1000,
    );
    this.logger.log(
      `Stored state '${state}' in Redis: ${JSON.stringify(stateData)}`,
    );

    const authenticationRequestUrl = this.configService.get<string>(
      'lti.authenticationRequestUrl',
    ) as string;
    const clientId = this.configService.get<string>('lti.clientId') as string;

    const redirectUrl = new URL(authenticationRequestUrl);
    redirectUrl.searchParams.append('scope', 'openid');
    redirectUrl.searchParams.append('response_type', 'id_token');
    redirectUrl.searchParams.append('client_id', clientId);
    redirectUrl.searchParams.append('redirect_uri', targetLinkUri);
    redirectUrl.searchParams.append('lti_message_hint', ltiMessageHint || '');
    redirectUrl.searchParams.append('state', state);
    redirectUrl.searchParams.append('response_mode', 'form_post');
    redirectUrl.searchParams.append('nonce', nonce);
    redirectUrl.searchParams.append('prompt', 'none');
    redirectUrl.searchParams.append('login_hint', loginHint);

    this.logger.log(`Redirecting to LMS with URL: ${redirectUrl.toString()}`);
    return redirectUrl.toString();
  }

  public async handleLtiLaunch(
    ltiLaunchRequestDto: LtiLaunchRequestDto,
  ): Promise<string> {
    const { idToken, state } = ltiLaunchRequestDto;

    const parsedState = await this.getStateFromRedis(state);

    const { nonce } = parsedState;

    const decodedJwt = await this.verifyJwtFromPlatform(idToken);

    const claims = decodedJwt.payload as LtiClaims;

    if (claims[LTI_CLAIMS.VERSION] !== LTI_VERSIONS.V1_3) {
      throw new BadRequestException('Unsupported LTI version');
    }

    if (
      claims[LTI_CLAIMS.MESSAGE_TYPE] !==
      LTI_MESSAGE_TYPES.LTI_RESOURCE_LINK_REQUEST
    ) {
      throw new BadRequestException('Unsupported LTI message type');
    }

    if (claims.nonce !== nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    // Upsert user
    const user = await this.userService.findOrCreateByLtiClaims(claims);
    this.logger.log(
      `LTI Launch: User processed in DB: ID ${user.id}, Email ${user.email}`,
    );

    // Process course
    const ltiContextClaim = claims[LTI_CLAIMS.CONTEXT] as LtiContextClaim;
    let course: Course | null = null;

    if (ltiContextClaim) {
      try {
        course =
          await this.courseService.findOrCreateByLtiContextClaims(claims);
        this.logger.log(
          `LTI Launch: Course processed in DB: ID ${course.id}, Title ${course.title}`,
        );

        await this.userCourseService.enrollUserInCourse(
          user,
          course,
          user.roles,
        );
        this.logger.log(
          `LTI Launch: User ${user.id} enrolled in course ${course.id} with roles: ${user.roles.join(', ')}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process LTI course or enroll user: ${(error as Error).message}`,
        );
      }
    }

    const tokens = await this.generateTokensForUser({
      userId: user.id,
      courseId: course?.id || undefined,
      email: user.email || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      roles: user.roles,
      sub: claims.sub,
      iss: claims.iss,
    });

    return JSON.stringify(tokens);
  }

  public async handleDeepLinkingRequest(
    ltiDeepLinkingDto: LtiDeepLinkingRequestDto,
  ): Promise<TokenResponse> {
    const { idToken, state } = ltiDeepLinkingDto;

    const parsedState = await this.getStateFromRedis(state);

    const { nonce } = parsedState;

    const decodedJwt = await this.verifyJwtFromPlatform(idToken);

    const claims = await this.validateIdTokenPayload(
      decodedJwt.payload as LtiClaims,
    );

    if (claims.messageType !== LtiMessageType.LTI_DEEP_LINKING_REQUEST) {
      throw new BadRequestException('Unsupported LTI message type');
    }

    if (claims.nonce !== nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    if (
      claims.azp &&
      claims.azp !== this.configService.get<string>('lti.clientId')
    ) {
      throw new UnauthorizedException('Invalid authorized party (azp) claim');
    }

    // Upsert user
    const user = await this.userService.findOrCreateByLtiClaims(
      decodedJwt.payload as LtiClaims,
    );
    this.logger.log(
      `LTI Launch: User processed in DB: ID ${user.id}, Email ${user.email}`,
    );

    const ltiContextClaim = claims?.context;
    let course: Course | null = null;

    if (ltiContextClaim) {
      try {
        course = await this.courseService.findOrCreateByLtiContextClaims(
          decodedJwt.payload as LtiClaims,
        );
        this.logger.log(
          `LTI Launch: Course processed in DB: ID ${course.id}, Title ${course.title}`,
        );

        await this.userCourseService.enrollUserInCourse(
          user,
          course,
          user.roles,
        );
        this.logger.log(
          `LTI Launch: User ${user.id} enrolled in course ${course.id} with roles: ${user.roles.join(', ')}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process LTI course or enroll user: ${(error as Error).message}`,
        );
      }
    }

    const tokens = await this.generateTokensForUser({
      userId: user.id,
      courseId: course?.id || undefined,
      email: user.email || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      roles: user.roles,
      sub: claims.sub,
      iss: claims.iss,
    });

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

    const keyRedis = this.getKeyRedisForDeepLinking(tokens.deviceId);

    await this.redisService.set(keyRedis, JSON.stringify(deepLinkingData));

    setTimeout(
      () => {
        (async () => {
          const deepLinkingData = await this.redisService.get(keyRedis);
          if (deepLinkingData) {
            await this.redisService.del(keyRedis);

            await this.handleDeepLinkingResponse(tokens.deviceId);
          }
        })().catch((error) => {
          this.logger.error(
            `Deep linking timeout handler failed: ${(error as Error).message}`,
          );
        });
      },
      10 * 60 * 1000,
    );

    return tokens;
  }

  public async handleDeepLinkingResponse(
    deviceId: string,
    ltiResourceLinkDto?: LtiResourceLinkDto,
  ) {
    const ltiResourceLinks = ltiResourceLinkDto
      ? [
          new LtiResourceLinkDto({
            ...ltiResourceLinkDto,
            type: ContentItemType.LTI_RESOURCE_LINK,
          }),
        ]
      : [];

    const keyRedis = this.getKeyRedisForDeepLinking(deviceId);
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

    const jwtPayload = new LtiDeepLinkingJwtPayloadDto({
      iss: this.configService.get<string>('lti.clientId') as string,
      aud: this.configService.get<string>('lti.platformId') as string,
      nonce: deepLinkingData.nonce,
      azp: deepLinkingData?.azp,
      messageType: LtiMessageType.LTI_DEEP_LINKING_RESPONSE,
      version: LTI_VERSIONS.V1_3,
      deploymentId: this.configService.get<string>(
        'lti.deploymentId',
      ) as string,
      data: deepLinkingData?.data,
      contentItems: ltiResourceLinks,
    });

    const jwt = await this.keysService.generateDeepLinkingJwt(jwtPayload);

    return {
      jwt,
      deepLinkReturnUrl: deepLinkingData.deepLinkReturnUrl,
    };
  }

  private getKeyRedisForDeepLinking(deviceId: string): string {
    return `lti:dl:${deviceId}`;
  }

  private async generateTokensForUser(
    payload: JwtPayload,
  ): Promise<TokenResponse> {
    const accessToken = await this.jwtAuthService.generateAccessToken(payload);
    this.logger.log('LTI Launch: Generated Access Token.');

    const deviceId = await this.jwtAuthService.generateDeviceId();
    const refreshToken = await this.jwtAuthService.generateRefreshToken(
      payload,
      deviceId,
    );
    this.logger.log('LTI Launch: Generated Refresh Token and stored in DB.');

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      redirectPath: this.getRedirectFrontendUrl(payload.roles),
      deviceId: deviceId,
    };
  }

  private async validateIdTokenPayload(
    payload: LtiClaims,
  ): Promise<IdTokenPayloadDto> {
    const claims = plainToInstance(IdTokenPayloadDto, payload);
    const errors = await validate(claims);

    if (errors.length > 0) {
      this.logger.error(
        `ID Token payload validation failed: ${JSON.stringify(errors)}`,
      );
      throw new BadRequestException('Invalid ID Token payload');
    }

    return claims;
  }

  private getRedirectFrontendUrl(roles: RoleEnum[]): string {
    if (roles.includes(RoleEnum.INSTRUCTOR)) {
      return this.configService.get<string>(
        'lti.frontendCallbackUrl.instructor',
      ) as string;
    }
    return this.configService.get<string>(
      'lti.frontendCallbackUrl.student',
    ) as string;
  }

  private async getStateFromRedis(state: string): Promise<LtiStatePayload> {
    const storedStateString = await this.redisService.get(`lti:state:${state}`);
    if (!storedStateString) {
      throw new UnauthorizedException(
        'Invalid or expired state parameter (CSRF protection failed)',
      );
    }
    const parsedState = JSON.parse(storedStateString) as LtiStatePayload;
    await this.redisService.del(`lti:state:${state}`);
    this.logger.log(
      `Retrieved state '${state}' from Redis: ${JSON.stringify(parsedState)}`,
    );

    return parsedState;
  }

  private async verifyJwtFromPlatform(
    idToken: string,
  ): Promise<jose.JWTVerifyResult> {
    const platformPublicKeysetUrl = this.configService.get<string>(
      'lti.publicKeysetUrl',
    ) as string;
    const clientId = this.configService.get<string>('lti.clientId') as string;
    const platformId = this.configService.get<string>(
      'lti.platformId',
    ) as string;

    let decodedJwt: jose.JWTVerifyResult;
    try {
      const JWKS = jose.createRemoteJWKSet(new URL(platformPublicKeysetUrl));
      decodedJwt = await jose.jwtVerify(idToken, JWKS, {
        audience: clientId,
        issuer: platformId,
        clockTolerance: 5,
      });

      return decodedJwt;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException(
        `JWT verification failed: ${(error as Error).message}`,
      );
    }
  }
}
