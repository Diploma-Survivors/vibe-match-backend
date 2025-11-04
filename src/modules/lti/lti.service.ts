import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as jose from 'jose';
import * as crypto from 'node:crypto';
import { Repository } from 'typeorm';
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
import { AssignmentContentType } from 'src/common/enums/assignment-content-type.enum';
import { type JwtPayload } from '../auth/interfaces/jwt.interface';
import { ContestsService } from '../contests/contests.service';
import { Contest } from '../contests/entities/contest.entity';
import { Course } from '../course/entities/course.entity';
import { ProblemsService } from '../problems/problems.service';
import { User } from '../user/entities/user.entity';
import { RoleEnum } from '../user/enums/role.enum';
import { IdTokenPayloadDto } from './dto/id-token-payload.dto';
import { LtiDeepLinkingRequestDto } from './dto/lti-deep-linking-request.dto';
import { LtiDeepLinkingJwtPayloadDto } from './dto/lti-deep-linking-response.dto';
import { LtiResourceLinkDto } from './dto/lti-resource-link.dto';
import { LtiLaunchSession } from './entities/lti-launch-session.entity';
import { ContentItemType } from './enums/content-item-type.enum';
import { LtiMessageType } from './enums/lti-message-type.enum';
import { KeysService } from './keys.service';

const LTI_STATE_TTL_SECONDS = 300;
const LTI_DEEP_LINKING_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);

  // Maps to hold frontend URLs based on roles and content types
  private readonly frontendAssignmentsPath = new Map<
    AssignmentContentType,
    Record<string, string>
  >();

  // Map to hold frontend set cookies URLs based on roles
  private readonly frontendSetCookiesUrl = new Map<RoleEnum, string>();

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
    @InjectRepository(LtiLaunchSession)
    private readonly ltiLaunchSessionRepository: Repository<LtiLaunchSession>,
  ) {
    // Initialize the frontend URL mappings from configuration
    this.frontendAssignmentsPath.set(AssignmentContentType.CONTEST, {
      [RoleEnum.STUDENT]: this.configService.get<string>(
        'lti.frontendContestUrl.student',
      ) as string,
      [RoleEnum.INSTRUCTOR]: this.configService.get<string>(
        'lti.frontendContestUrl.instructor',
      ) as string,
    });

    // Initialize the frontend set cookies URL mappings from configuration
    this.frontendSetCookiesUrl.set(
      RoleEnum.STUDENT,
      this.configService.get<string>(
        'lti.frontendSetCookiesUrl.student',
      ) as string,
    );
    this.frontendSetCookiesUrl.set(
      RoleEnum.INSTRUCTOR,
      this.configService.get<string>(
        'lti.frontendSetCookiesUrl.instructor',
      ) as string,
    );
  }

  /**
   * @description Handles the LTI login initiation request.
   * @param ltiLoginInitiationDto it contains iss, loginHint, targetLinkUri, ltiMessageHint
   * @returns The URL to redirect the user to the LMS authentication endpoint.
   */
  public async handleLoginInitiation(
    ltiLoginInitiationDto: LtiLoginInitiationDto,
  ): Promise<string> {
    const { iss, loginHint, targetLinkUri, ltiMessageHint } =
      ltiLoginInitiationDto;

    // Validate the issuer (iss) against the configured platform ID
    const platformId = this.configService.get<string>(
      'lti.platformId',
    ) as string;
    if (iss !== platformId) {
      throw new BadRequestException('Invalid issuer');
    }

    // Generate state and nonce for CSRF protection and replay attack prevention
    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');

    // Store state and nonce in Redis with a TTL
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

    // Construct the redirect URL to the LMS authentication endpoint
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

  /**
   * @description Handles the LTI launch request (Do not use for deep linking - Select Content).
   * @param ltiLaunchRequestDto it contains state, idToken, and other launch parameters
   * @returns The response for the LTI launch request.
   */
  public async handleLtiLaunch(
    ltiLaunchRequestDto: LtiLaunchRequestDto,
  ): Promise<LtiLaunchResponse> {
    // Validate and retrieve the nonce from the state parameter
    const nonce = await this.validateAndGetNonceFromState(
      ltiLaunchRequestDto.state,
    );

    // Validate and parse the ID token to extract claims
    const claims = await this.getAndValidateClaims(
      ltiLaunchRequestDto.idToken,
      LtiMessageType.LTI_RESOURCE_LINK_REQUEST,
      nonce,
    );

    // Get content identifiers from custom claims (currently supporting problem or contest)
    const contestId = Number.parseInt(
      claims.customClaims?.['contestId'] as string,
    );
    if (Number.isNaN(contestId)) {
      throw new BadRequestException('Missing required custom claim: contestId');
    }

    // Update or create the user in the local database based on LTI claims
    const user = await this.upsertUserFromClaims(claims);

    // Process the course information and enroll the user if course context is provided
    const course = await this.processCourseAndEnrollUser(claims, user);

    // Extract AGS endpoint from claims and save LTI launch session if present
    const agsEndpoint = claims.agsEndpoint;
    let ltiSession: LtiLaunchSession | null = null;

    if (agsEndpoint) {
      this.logger.log(
        `AGS endpoint detected - Lineitem: ${agsEndpoint.lineitem || 'NULL'}, Scopes: ${agsEndpoint.scope?.join(',') || 'NONE'}`,
      );
    } else {
      this.logger.warn(
        `No AGS endpoint in LTI claims - Activity may not be configured to accept grades`,
      );
    }

    if (agsEndpoint && contestId) {
      ltiSession = await this.saveLtiLaunchSession({
        userId: user.id,
        ltiUserId: claims.sub,
        contestId: contestId ?? null,
        resourceLinkId: claims.resourceLink.id,
        contextId: claims.context.id,
        agsLineitemUrl: agsEndpoint.lineitem,
        agsScopes: agsEndpoint.scope,
        deploymentId: claims.deploymentId,
        platformIssuer: claims.iss,
      });
      this.logger.log(
        `LTI launch session created: ${ltiSession.id} for user ${user.id}`,
      );
    }

    // Issue JWT tokens for the user
    const tokens = await this.issueTokens(user, claims, course, ltiSession?.id);

    const contentType = AssignmentContentType.CONTEST;

    // Determine the appropriate redirect target based on user roles and content type
    const redirectTarget = this.getRedirectTargetForFrontend(
      user.roles,
      contentType,
      contestId,
    );

    return {
      ...tokens,
      ...redirectTarget,
    };
  }

  /**
   * @description Handles the LTI deep linking request (Use for deep linking - Select Content).
   * @param ltiDeepLinkingDto it contains state, idToken, and other deep linking parameters
   * @returns The response for the LTI deep linking request.
   */
  public async handleDeepLinkingRequest(
    ltiDeepLinkingDto: LtiDeepLinkingRequestDto,
  ): Promise<LtiLaunchResponse> {
    // Validate and retrieve the nonce from the state parameter
    const nonce = await this.validateAndGetNonceFromState(
      ltiDeepLinkingDto.state,
    );

    // Validate and parse the ID token to extract claims
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

    // Update or create the user in the local database based on LTI claims
    const user = await this.upsertUserFromClaims(claims);

    // Process the course information and enroll the user if course context is provided
    const course = await this.processCourseAndEnrollUser(claims, user);

    // Issue JWT tokens for the user
    const tokens = await this.issueTokens(user, claims, course);

    // Validate that the platform accepts LTI Resource Link content items
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

    // Store deep linking data in Redis to handle user selection later
    const keyRedis = this.getKeyRedisForDeepLinking(tokens.deviceId);
    await this.redisService.set(keyRedis, JSON.stringify(deepLinkingData));

    // If the user does not complete deep linking within the timeout, clean up the Redis entry and respond with empty content items
    setTimeout(() => {
      (async () => {
        const deepLinkingData = await this.redisService.get(keyRedis);
        if (deepLinkingData) {
          await this.redisService.del(keyRedis);

          await this.handleDeepLinkingResponse(
            tokens.deviceId,
            course?.id as number,
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

  /**
   * @description Handles the LTI deep linking response after user selects content.
   * @param deviceId Use to retrieve deep linking session from Redis
   * @param currentCourse The current course ID
   * @param ltiResourceLinkDto The LTI resource link data
   * @returns The response for the LTI deep linking response.
   */
  public async handleDeepLinkingResponse(
    deviceId: string,
    currentCourse: number,
    ltiResourceLinkDto?: LtiResourceLinkDto,
  ) {
    // Resource link for tool handle redirect correctly when launching from activity in LMS
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

    const contestId = Number.parseInt(
      ltiResourceLinkDto?.custom?.['contestId'] as string,
    );
    if (Number.isNaN(contestId)) {
      throw new BadRequestException('Missing required custom claim: contestId');
    }

    // Validate the selected content belongs to the current course
    const contest = await this.contestService.findOne(
      { id: contestId },
      {
        id: true,
        courseId: true,
      },
    );
    if (contest?.courseId !== currentCourse) {
      throw new BadRequestException('Contest not found');
    }

    this.logger.debug(`Deep linking selected contest ID: ${contestId}`);

    // Retrieve deep linking session data from Redis
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

    // Create the JWT payload for the deep linking response
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

    // Sign the JWT for the deep linking response, LMS will verify the signature through the public keyset URL
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

  /**
   * @description Issues JWT tokens for the user based on LTI claims and optional course.
   * @param user The user object
   * @param claims The LTI claims
   * @param course The course object (optional)
   * @param ltiSessionId The LTI launch session ID (optional)
   * @returns The generated JWT tokens
   */
  private issueTokens(
    user: User,
    claims: IdTokenPayloadDto,
    course?: Course | null,
    ltiSessionId?: string,
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
      ltiSessionId: ltiSessionId || undefined,
    });
  }

  /**
   * @description Processes the course information from LTI claims and enrolls the user if course context is provided.
   * @param claims The LTI claims
   * @param user The user object
   * @returns The enrolled course or null if no course context is provided.
   */
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

  /**
   * @description Updates or creates the user in the local database based on LTI claims.
   * @param claims The LTI claims
   * @returns The updated or created user
   */
  private async upsertUserFromClaims(claims: IdTokenPayloadDto): Promise<User> {
    const user = await this.userService.findOrCreateByLtiClaims(claims);
    this.logger.log(
      `LTI Launch: User processed in DB: ID ${user.id}, Email ${user.email}`,
    );
    return user;
  }

  /**
   * @description Validates the ID token and extracts claims.
   * @param idToken The ID token to validate
   * @param expectedMessageType The expected LTI message type
   * @param nonce The nonce value to validate
   * @returns The extracted claims
   */
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

  /**
   * @description Validates the state parameter and retrieves the associated nonce from Redis.
   * @param state The state parameter to validate
   * @returns The associated nonce
   */
  private async validateAndGetNonceFromState(state: string): Promise<string> {
    const parsedState = await this.getStateFromRedis(state);
    return parsedState.nonce;
  }

  /**
   * @description Constructs the Redis key for storing state data.
   * @param state The state parameter
   * @returns The Redis key for the state
   */
  private getStateRedisKey(state: string): string {
    return `lti:state:${state}`;
  }

  /**
   * @description Determines the appropriate redirect target based on user roles and content type.
   * @param roles The user roles
   * @param contentType The content type
   * @param contentId The content ID
   * @returns The redirect target information
   */
  private getRedirectTargetForFrontend(
    roles: RoleEnum[],
    contentType: AssignmentContentType,
    contentId: number,
  ): { redirectPath: string; postRedirectUrl: string } {
    let baseUrl = '';
    let postRedirectUrl = '';

    if (roles.includes(RoleEnum.INSTRUCTOR)) {
      baseUrl = this.frontendAssignmentsPath.get(contentType)?.[
        RoleEnum.INSTRUCTOR
      ] as string;
      postRedirectUrl = this.frontendSetCookiesUrl.get(
        RoleEnum.INSTRUCTOR,
      ) as string;
    } else {
      baseUrl = this.frontendAssignmentsPath.get(contentType)?.[
        RoleEnum.STUDENT
      ] as string;
      postRedirectUrl = this.frontendSetCookiesUrl.get(
        RoleEnum.STUDENT,
      ) as string;
    }

    return {
      redirectPath: baseUrl.replace('{{CONTENT_ID}}', contentId.toString()),
      postRedirectUrl,
    };
  }

  /**
   * @description Constructs the Redis key for deep linking sessions.
   * @param deviceId The device ID
   * @returns The Redis key for deep linking
   */
  private getKeyRedisForDeepLinking(deviceId: string): string {
    return `lti:dl:${deviceId}`;
  }

  /**
   * @description Generates access and refresh tokens for a user.
   * @param payload The JWT payload containing user information
   * @returns The generated token response
   */
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

  /**
   * @description Transforms the raw JWT payload into a structured IdTokenPayloadDto.
   * @param payload The raw JWT payload
   * @returns The structured IdTokenPayloadDto
   */
  private transformIdTokenPayload(payload: LtiClaims): IdTokenPayloadDto {
    const claims = plainToInstance(IdTokenPayloadDto, payload);
    return claims;
  }

  /**
   * @description Validates the state parameter and retrieves the associated nonce from Redis.
   * @param state The state parameter to validate
   * @returns The associated nonce
   */
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

  /**
   * @description Verifies the JWT from the platform.
   * @param idToken The JWT to verify
   * @returns The verified JWT payload
   */
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

  private async saveLtiLaunchSession(params: {
    userId: number;
    ltiUserId: string;
    contestId: number | null;
    resourceLinkId: string;
    contextId: string;
    agsLineitemUrl: string | null;
    agsScopes: string[] | null;
    deploymentId: string;
    platformIssuer: string;
  }): Promise<LtiLaunchSession> {
    const sessionTtl =
      this.configService.get<number>('lti.ags.sessionTtl') ?? 86400; // Default: 24 hours
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + sessionTtl);

    const session = this.ltiLaunchSessionRepository.create({
      user: { id: params.userId } as User,
      ltiUserId: params.ltiUserId,
      contest: params.contestId ? ({ id: params.contestId } as Contest) : null,
      resourceLinkId: params.resourceLinkId,
      contextId: params.contextId,
      agsLineitemUrl: params.agsLineitemUrl,
      agsScopes: params.agsScopes,
      deploymentId: params.deploymentId,
      platformIssuer: params.platformIssuer,
      expiresAt,
    });

    const savedSession = await this.ltiLaunchSessionRepository.save(session);
    this.logger.log(
      `LTI launch session created: ${savedSession.id} for user ${params.userId}`,
    );
    return savedSession;
  }
}
