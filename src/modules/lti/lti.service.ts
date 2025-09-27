import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jose from 'jose';
import { JwtAuthService } from '../../modules/auth/jwt-auth.service';
import { CourseService } from '../../modules/course/services/course.service';
import { UserCourseService } from '../../modules/user-course/services/user-course.service';
import { UserService } from '../../modules/user/user.service';
import { RedisService } from '../../shared/redis/redis.service';
import { LTI_ROLES, LTI_VERSIONS } from './constants/lti.constants';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import {
  LtiClaims,
  LtiLaunchResponse,
  LtiStatePayload,
  TokenResponse,
} from './interfaces/lti.interface';

import { plainToInstance } from 'class-transformer';
import { type JwtPayload } from '../auth/interfaces/jwt.interface';
import { ContestsService } from '../contests/contests.service';
import { Course } from '../course/entities/course.entity';
import { ProblemType } from '../problems/enums/problem-type.enum';
import { ProblemsService } from '../problems/problems.service';
import { User } from '../user/entities/user.entity';
import { RoleEnum } from '../user/enums/role.enum';
import { IdTokenPayloadDto } from './dto/id-token-payload.dto';
import { LtiDeepLinkingRequestDto } from './dto/lti-deep-linking-request.dto';
import { LtiDeepLinkingJwtPayloadDto } from './dto/lti-deep-linking-response.dto';
import { LtiResourceLinkDto } from './dto/lti-resource-link.dto';
import { ContentItemType } from './enums/content-item-type.enum';
import { LtiMessageType } from './enums/lti-message-type.enum';
import { KeysService } from './keys.service';

const LTI_STATE_TTL_SECONDS = 300;
const LTI_DEEP_LINKING_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly courseService: CourseService,
    private readonly userCourseService: UserCourseService,
    private readonly keysService: KeysService,
    private readonly problemsService: ProblemsService,
    private readonly contestService: ContestsService,
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
    const key = this.getStateRedisKey(state);

    await this.redisService.set(
      key,
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
  ): Promise<LtiLaunchResponse> {
    const nonce = await this.validateAndGetNonceFromState(
      ltiLaunchRequestDto.state,
    );

    const claims = await this.getAndValidateClaims(
      ltiLaunchRequestDto.idToken,
      LtiMessageType.LTI_RESOURCE_LINK_REQUEST,
      nonce,
    );

    const problemId = claims.customClaims?.['problemId'] as string;
    const contestId = claims.customClaims?.['contestId'] as string;
    if (!problemId && !contestId) {
      throw new BadRequestException(
        'Missing required custom claim: problemId or contestId',
      );
    }

    const user = await this.upsertUserFromClaims(claims);

    const course = await this.processCourseAndEnrollUser(claims, user);

    const tokens = await this.issueTokens(user, claims, course);

    return {
      ...tokens,
      ...this.getRedirectTargetForFrontend(user.roles, problemId),
    };
  }

  public async handleDeepLinkingRequest(
    ltiDeepLinkingDto: LtiDeepLinkingRequestDto,
  ): Promise<LtiLaunchResponse> {
    const nonce = await this.validateAndGetNonceFromState(
      ltiDeepLinkingDto.state,
    );

    const claims = await this.getAndValidateClaims(
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

    const user = await this.upsertUserFromClaims(claims);

    const course = await this.processCourseAndEnrollUser(claims, user);

    const tokens = await this.issueTokens(user, claims, course);

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
      `Storing deep linking data for deviceId ${tokens.deviceId}: ${JSON.stringify(
        deepLinkingData,
      )}`,
    );

    const keyRedis = this.getKeyRedisForDeepLinking(tokens.deviceId);
    await this.redisService.set(keyRedis, JSON.stringify(deepLinkingData));

    setTimeout(() => {
      (async () => {
        const deepLinkingData = await this.redisService.get(keyRedis);
        if (deepLinkingData) {
          await this.redisService.del(keyRedis);

          await this.handleDeepLinkingResponse(
            tokens.deviceId,
            course?.id as string,
          );
        }
      })().catch((error) => {
        this.logger.error(
          `Deep linking timeout handler failed: ${(error as Error).message}`,
        );
      });
    }, LTI_DEEP_LINKING_TIMEOUT_MS);

    const redirectPath = this.configService.get<string>(
      'lti.frontendCallbackUrl.deepLinking',
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

  public async handleDeepLinkingResponse(
    deviceId: string,
    currentCourse: string,
    ltiResourceLinkDto?: LtiResourceLinkDto,
  ) {
    const url = this.configService.get<string>('lti.toolRedirectionUri');
    const ltiResourceLinks = ltiResourceLinkDto
      ? [
          new LtiResourceLinkDto({
            ...ltiResourceLinkDto,
            type: ContentItemType.LTI_RESOURCE_LINK,
            url,
          }),
        ]
      : [];

    const problemId = ltiResourceLinkDto?.custom?.['problemId'] as string;
    const contestId = ltiResourceLinkDto?.custom?.['contestId'] as string;

    if (!problemId && !contestId) {
      throw new BadRequestException(
        'Missing required custom claim: problemId or contestId',
      );
    }
    if (problemId && contestId) {
      throw new BadRequestException(
        'Redundant field of custom claims: provide either problemId or contestId, not both',
      );
    }

    if (problemId) {
      const problem = await this.problemsService.findById(problemId, {
        id: true,
        type: true,
      });
      if (!problem || problem.type === ProblemType.CONTEST) {
        throw new BadRequestException('Problem not found or invalid');
      }

      this.logger.debug(`Deep linking selected problem ID: ${problemId}`);
    } else if (contestId) {
      const contest = await this.contestService.findOne(
        { id: contestId },
        {
          id: true,
          course: true,
        },
      );
      if (!contest || contest.course.id !== currentCourse) {
        throw new BadRequestException('Contest not found');
      }

      this.logger.debug(`Deep linking selected contest ID: ${contestId}`);
    }

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

  private issueTokens(
    user: User,
    claims: IdTokenPayloadDto,
    course?: Course | null,
  ) {
    return this.generateTokensForUser({
      userId: user.id,
      courseId: course?.id || undefined,
      email: user.email || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      roles: user.roles,
      sub: claims.sub,
      iss: claims.iss,
    });
  }

  private async processCourseAndEnrollUser(
    claims: IdTokenPayloadDto,
    user: User,
  ): Promise<Course | null> {
    if (!claims.context) {
      return null;
    }

    try {
      const course =
        await this.courseService.findOrCreateByLtiContextClaims(claims);
      this.logger.log(
        `LTI Launch: Course processed in DB: ID ${course.id}, Title ${course.title}`,
      );

      await this.userCourseService.enrollUserInCourse(user, course, user.roles);
      this.logger.log(
        `LTI Launch: User ${user.id} enrolled in course ${course.id} with roles: ${user.roles.join(', ')}`,
      );

      return course;
    } catch (error) {
      this.logger.error(
        `Failed to process LTI course or enroll user: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async upsertUserFromClaims(claims: IdTokenPayloadDto): Promise<User> {
    const user = await this.userService.findOrCreateByLtiClaims(claims);
    this.logger.log(
      `LTI Launch: User processed in DB: ID ${user.id}, Email ${user.email}`,
    );
    return user;
  }

  private async getAndValidateClaims(
    idToken: string,
    expectedMessageType: LtiMessageType,
    nonce: string,
  ): Promise<IdTokenPayloadDto> {
    const decodedJwt = await this.verifyJwtFromPlatform(idToken);

    const claims = this.transformIdTokenPayload(
      decodedJwt.payload as LtiClaims,
    );

    if (claims.version !== LTI_VERSIONS.V1_3) {
      throw new BadRequestException('Unsupported LTI version');
    }

    if (claims.messageType !== expectedMessageType) {
      throw new BadRequestException('Unsupported LTI message type');
    }

    if (claims.nonce !== nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    return claims;
  }

  private async validateAndGetNonceFromState(state: string): Promise<string> {
    const parsedState = await this.getStateFromRedis(state);
    return parsedState.nonce;
  }

  private getStateRedisKey(state: string): string {
    return `lti:state:${state}`;
  }

  private getRedirectTargetForFrontend(
    roles: RoleEnum[],
    problemId: string,
  ): { redirectPath: string; postRedirectUrl: string } {
    let baseUrl = '';
    let postRedirectUrl = '';

    if (roles.includes(RoleEnum.INSTRUCTOR)) {
      baseUrl = this.configService.get<string>(
        'lti.frontendCallbackUrl.instructor',
      ) as string;
      postRedirectUrl = this.configService.get<string>(
        'lti.frontendSetCookiesUrl.instructor',
      ) as string;
    } else {
      baseUrl = this.configService.get<string>(
        'lti.frontendCallbackUrl.student',
      ) as string;
      postRedirectUrl = this.configService.get<string>(
        'lti.frontendSetCookiesUrl.student',
      ) as string;
    }

    return { redirectPath: `${baseUrl}/${problemId}`, postRedirectUrl };
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
      deviceId: deviceId,
    };
  }

  private transformIdTokenPayload(payload: LtiClaims): IdTokenPayloadDto {
    const claims = plainToInstance(IdTokenPayloadDto, payload);
    return claims;
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
