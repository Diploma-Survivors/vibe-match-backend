// NestJS
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

// Third-party
import * as crypto from 'node:crypto';
import { Repository } from 'typeorm';

// Shared/Common
import { RedisService } from 'src/shared/redis/redis.service';

// Relative imports
import { Contest } from '../contests/entities/contest.entity';
import { User } from '../user/entities/user.entity';
import { LTI_STATE_PREFIX } from './constants/redis.constants';
import { LtiDeepLinkingRequestDto } from './dto/lti-deep-linking-request.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiResourceLinkDto } from './dto/lti-resource-link.dto';
import { LtiLaunchSession } from './entities/lti-launch-session.entity';
import { LtiMessageType } from './enums/lti-message-type.enum';
import { LtiLaunchResponse, LtiStatePayload } from './interfaces/lti.interface';
import { LtiUtilService } from './lti-util.service';
import { DeepLinkingFactory } from './strategies/deep-linking/deep-linking.factory';
import { ResourceUrlFactory } from './strategies/resource-url.factory';

// Type imports
import { ContentType } from 'src/common/enums/content-type.enum';
import { type JwtPayload } from '../auth/interfaces/jwt.interface';
import { LtiDeployment } from './entities/lti-deployment.entity';

const LTI_STATE_TTL_SECONDS = 300;

@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @InjectRepository(LtiLaunchSession)
    private readonly ltiLaunchSessionRepository: Repository<LtiLaunchSession>,
    @InjectRepository(LtiDeployment)
    private readonly ltiDeploymentRepository: Repository<LtiDeployment>,
    private readonly resourceUrlFactory: ResourceUrlFactory,
    private readonly deepLinkingFactory: DeepLinkingFactory,
    private readonly ltiUtilService: LtiUtilService,
  ) {}

  /**
   * @description Handles the LTI login initiation request.
   * @param ltiLoginInitiationDto it contains iss, loginHint, targetLinkUri, ltiMessageHint
   * @returns The URL to redirect the user to the LMS authentication endpoint.
   */
  public async handleLoginInitiation(
    ltiLoginInitiationDto: LtiLoginInitiationDto,
  ): Promise<string> {
    const {
      iss,
      clientId,
      ltiDeploymentId,
      loginHint,
      targetLinkUri,
      ltiMessageHint,
    } = ltiLoginInitiationDto;

    // Validate LTI deployment configuration
    const ltiDeployment = await this.ltiDeploymentRepository.findOne({
      where: {
        issuerUrl: iss,
        clientId,
        deploymentId: ltiDeploymentId,
      },
    });
    if (!ltiDeployment) {
      throw new BadRequestException(
        'LTI deployment not found, please config it',
      );
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

    const authenticationRequestUrl = ltiDeployment.authenticationUrl;

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
    const nonce = await this.ltiUtilService.validateAndGetNonceFromState(
      ltiLaunchRequestDto.state,
    );

    // Validate and parse the ID token to extract claims
    const claims = await this.ltiUtilService.getAndValidateClaims(
      ltiLaunchRequestDto.idToken,
      LtiMessageType.LTI_RESOURCE_LINK_REQUEST,
      nonce,
    );

    const ltiDeployment = await this.ltiDeploymentRepository.findOne({
      where: {
        issuerUrl: claims.iss,
        clientId: claims.aud?.[0] || '',
        deploymentId: claims.deploymentId,
      },
    });
    if (!ltiDeployment) {
      throw new BadRequestException(
        'LTI deployment not found, please config it',
      );
    }

    // Update or create the user in the local database based on LTI claims
    const user = await this.ltiUtilService.upsertUserFromClaims(
      claims,
      ltiDeployment,
    );

    // Process the course information and enroll the user if course context is provided
    const course = await this.ltiUtilService.processCourseAndEnrollUser(
      claims,
      user,
      ltiDeployment,
    );

    // Extract AGS endpoint from claims and save LTI launch session if present
    const agsEndpoint = claims.agsEndpoint;
    let ltiSession: LtiLaunchSession | null = null;

    if (agsEndpoint) {
      this.logger.log(
        `AGS endpoint detected - Lineitem: ${
          agsEndpoint.lineitem || 'NULL'
        }, Scopes: ${agsEndpoint.scope?.join(',') || 'NONE'}`,
      );
    } else {
      this.logger.warn(
        `No AGS endpoint in LTI claims - Activity may not be configured to accept grades`,
      );
    }

    const customParams = claims.customClaims;
    const contentType = customParams?.['contentType'] as ContentType;
    const contestId = Number.parseInt(
      claims.customClaims?.['contestId'] as string,
    );

    if (
      agsEndpoint &&
      contentType === ContentType.CONTEST &&
      !isNaN(contestId)
    ) {
      ltiSession = await this.saveLtiLaunchSession({
        userId: user.id,
        ltiUserId: claims.sub,
        contestId: contestId ?? null,
        resourceLinkId: claims.resourceLink.id,
        contextId: claims.context.id,
        agsLineitemUrl: agsEndpoint.lineitem,
        agsScopes: agsEndpoint.scope,
        ltiDeployment,
      });
      this.logger.log(
        `LTI launch session created: ${ltiSession.id} for user ${user.id}`,
      );
    }

    // Issue JWT tokens for the user
    const tokens = await this.ltiUtilService.issueTokens(
      user,
      claims,
      course,
      ltiSession?.id,
    );

    const resourceUrlBuilder = this.resourceUrlFactory.getBuilder(contentType);
    const redirectPath = resourceUrlBuilder.buildRedirectUrl(
      user.roles,
      customParams,
    );
    const postRedirectUrl = resourceUrlBuilder.buildSetCookiesUrl(user.roles);

    return {
      ...tokens,
      redirectPath,
      postRedirectUrl,
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
    const strategy = this.deepLinkingFactory.getStrategy();
    return strategy.handleRequest(ltiDeepLinkingDto);
  }

  /**
   * @description Handles the LTI deep linking response after user selects content.
   * @param deviceId Use to retrieve deep linking session from Redis
   * @param user The current user
   * @param ltiResourceLinkDto The LTI resource link data
   * @returns The response for the LTI deep linking response.
   */
  public async handleDeepLinkingResponse(
    deviceId: string,
    user: JwtPayload,
    ltiResourceLinkDto: LtiResourceLinkDto,
  ) {
    const strategy = this.deepLinkingFactory.getStrategy();
    return strategy.handleResponse(ltiResourceLinkDto, user, deviceId);
  }

  /**
   * @description Constructs the Redis key for storing state data.
   * @param state The state parameter
   * @returns The Redis key for the state
   */
  private getStateRedisKey(state: string): string {
    return `${LTI_STATE_PREFIX}${state}`;
  }

  private async saveLtiLaunchSession(params: {
    userId: number;
    ltiUserId: string;
    contestId: number | null;
    resourceLinkId: string;
    contextId: string;
    agsLineitemUrl: string | null;
    agsScopes: string[] | null;
    ltiDeployment: LtiDeployment;
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
      ltiDeployment: params.ltiDeployment,
      expiresAt,
    });

    const savedSession = await this.ltiLaunchSessionRepository.save(session);
    this.logger.log(
      `LTI launch session created: ${savedSession.id} for user ${
        params.userId
      }`,
    );
    return savedSession;
  }
}
