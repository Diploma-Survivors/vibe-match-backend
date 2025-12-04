import { JwtPayload } from 'src/modules/auth/interfaces/jwt.interface';
import { LtiDeepLinkingRequestDto } from '../../dto/lti-deep-linking-request.dto';
import { LtiResourceLinkDto } from '../../dto/lti-resource-link.dto';
import { LtiLaunchResponse } from '../../interfaces/lti.interface';

export interface DeepLinkingStrategy {
  handleRequest(
    ltiDeepLinkingDto: LtiDeepLinkingRequestDto,
  ): Promise<LtiLaunchResponse>;
  handleResponse(
    ltiDeepLinkingResponse: LtiResourceLinkDto,
    user: JwtPayload,
    deviceId: string,
  ): Promise<{ jwt: string; deepLinkReturnUrl: string }>;
}
