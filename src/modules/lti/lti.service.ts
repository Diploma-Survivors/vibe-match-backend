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
import { LtiClaims, LtiContextClaim } from './interfaces/lti.interface';

// TODO: Use Redis to store state, nonce, and target_link_uri
const stateStore = new Map<
  string,
  { nonce: string; targetLinkUri: string; lti_message_hint?: string }
>();

@Injectable()
export class LtiService {
  constructor(private readonly configService: ConfigService) {}

  public handleLoginInitiation(
    ltiLoginInitiationDto: LtiLoginInitiationDto,
  ): string {
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

    stateStore.set(state, {
      nonce,
      targetLinkUri: target_link_uri,
      lti_message_hint,
    });

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

    return redirectUrl.toString();
  }

  public async handleLtiLaunch(
    ltiLaunchRequestDto: LtiLaunchRequestDto,
  ): Promise<string> {
    const { id_token, state } = ltiLaunchRequestDto;

    const storedState = stateStore.get(state);
    if (!storedState) {
      throw new Error(
        'Invalid or expired state parameter (CSRF protection failed)',
      );
    }
    stateStore.delete(state);

    const { nonce } = storedState;

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

    console.log('LTI Launch successful! Claims:', claims);

    const context = claims[LTI_CLAIMS.CONTEXT] as LtiContextClaim;
    return `LTI Launch Successful for user: ${claims.sub} in course: ${context?.title || context?.label}`;
  }
}
