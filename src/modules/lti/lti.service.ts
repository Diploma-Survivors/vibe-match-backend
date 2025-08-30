import { Injectable } from '@nestjs/common';
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
import { LtiClaims } from './interfaces/lti.interface';
import { RedisService } from '../../shared/redis/redis.service';
import { UserService } from '../../modules/user/user.service';
import { JwtAuthService } from '../../modules/auth/jwt-auth.service';

const LTI_STATE_TTL_SECONDS = 300;
const FRONTEND_AUTH_CALLBACK_URL = 'http://localhost:3001/problems';

@Injectable()
export class LtiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  public async handleLoginInitiation(
    ltiLoginInitiationDto: LtiLoginInitiationDto,
  ): Promise<string> {
    const { iss, login_hint, target_link_uri, lti_message_hint } =
      ltiLoginInitiationDto;

    const platformId = this.configService.get<string>(
      'lti.platformId',
    ) as string;
    if (iss !== platformId) {
      throw new Error('Invalid issuer');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');

    const stateData = { nonce, target_link_uri, lti_message_hint };
    await this.redisService.set(
      `lti:state:${state}`,
      JSON.stringify(stateData),
      LTI_STATE_TTL_SECONDS,
    );
    console.log(`LtiService: Stored state '${state}' in Redis:`, stateData);

    const authenticationRequestUrl = this.configService.get<string>(
      'lti.authenticationRequestUrl',
    ) as string;
    const clientId = this.configService.get<string>('lti.clientId') as string;
    const toolRedirectionUri = this.configService.get<string>(
      'lti.toolRedirectionUri',
    ) as string;

    const redirectUrl = new URL(authenticationRequestUrl);
    redirectUrl.searchParams.append('scope', 'openid');
    redirectUrl.searchParams.append('response_type', 'id_token');
    redirectUrl.searchParams.append('client_id', clientId);
    redirectUrl.searchParams.append('redirect_uri', toolRedirectionUri);
    redirectUrl.searchParams.append('lti_message_hint', lti_message_hint || '');
    redirectUrl.searchParams.append('state', state);
    redirectUrl.searchParams.append('response_mode', 'form_post');
    redirectUrl.searchParams.append('nonce', nonce);
    redirectUrl.searchParams.append('prompt', 'none');
    redirectUrl.searchParams.append('login_hint', login_hint);

    console.log('Redirecting to Moodle with URL:', redirectUrl.toString());
    return redirectUrl.toString();
  }

  public async handleLtiLaunch(
    ltiLaunchRequestDto: LtiLaunchRequestDto,
  ): Promise<string> {
    const { id_token, state } = ltiLaunchRequestDto;

    const storedStateString = await this.redisService.get(`lti:state:${state}`);
    if (!storedStateString) {
      throw new Error(
        'Invalid or expired state parameter (CSRF protection failed)',
      );
    }
    const parsedState = JSON.parse(storedStateString) as {
      nonce: string;
      target_link_uri: string;
      lti_message_hint?: string;
    };
    await this.redisService.del(`lti:state:${state}`);
    console.log(
      `LtiService: Retrieved state '${state}' from Redis:`,
      parsedState,
    );

    const { nonce } = parsedState;

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
      decodedJwt = await jose.jwtVerify(id_token, JWKS, {
        audience: clientId,
        issuer: platformId,
        clockTolerance: 5,
      });
    } catch (error) {
      throw new Error(`JWT verification failed: ${(error as Error).message}`);
    }

    const claims = decodedJwt.payload as LtiClaims;

    if (claims[LTI_CLAIMS.VERSION] !== LTI_VERSIONS.V1_3) {
      throw new Error('Unsupported LTI version');
    }

    if (
      claims[LTI_CLAIMS.MESSAGE_TYPE] !==
      LTI_MESSAGE_TYPES.LTI_RESOURCE_LINK_REQUEST
    ) {
      throw new Error('Unsupported LTI message type');
    }

    if (claims.nonce !== nonce) {
      throw new Error('Invalid nonce');
    }

    const user = await this.userService.findOrCreateByLtiClaims(claims);
    console.log('LTI Launch: User processed in DB:', user.id, user.email);

    const internalJwtPayload = {
      userId: user.id,
      roles: (claims[LTI_CLAIMS.ROLES] || []) as string[],
      sub: claims.sub,
      iss: claims.iss,
    };
    const internalJwt = this.jwtAuthService.generateJwt(internalJwtPayload);
    console.log('LTI Launch: Generated Internal JWT.');

    return JSON.stringify({
      jwt: internalJwt,
      redirectPath: FRONTEND_AUTH_CALLBACK_URL,
    });
  }
}
