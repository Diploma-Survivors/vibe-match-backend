import { ApiProperty } from '@nestjs/swagger';
import { LtiMessageType } from '../enums/lti-message-type.enum';
import { LtiResourceLinkDto } from './lti-resource-link.dto';
import { Expose } from 'class-transformer';
import { LTI_CLAIMS } from '../constants/lti.constants';

export class LtiDeepLinkingResponseDto {
  jwt: string;
}

export class LtiDeepLinkingJwtPayloadDto {
  @ApiProperty({
    description: 'Issuer identifier',
    example: 'https://lms.example.com',
  })
  iss: string;

  @ApiProperty({
    description: 'Audience that this token is intended for',
    example: 'client_id_12345',
  })
  aud: string;

  @ApiProperty({
    description: 'Nonce value to associate a client session with an token',
    example: 'n-0S6_WzA2Mj',
  })
  nonce: string;

  @ApiProperty({
    description:
      'Authorized party - the party to which the ID token was issued',
    example: 'client_id_12345',
    required: false,
  })
  azp?: string;

  @ApiProperty({
    description: 'LTI message type must be LtiDeepLinkingResponse',
    example: LtiMessageType.LTI_DEEP_LINKING_RESPONSE,
    enum: () => LtiMessageType,
  })
  @Expose({ name: LTI_CLAIMS.MESSAGE_TYPE })
  messageType: LtiMessageType;

  @ApiProperty({
    description: 'LTI version must be 1.3.0',
    example: '1.3.0',
  })
  @Expose({ name: LTI_CLAIMS.VERSION })
  version: string;

  @ApiProperty({
    description: 'Deployment ID',
    example: 'deployment_id_67890',
  })
  @Expose({ name: LTI_CLAIMS.DEPLOYMENT_ID })
  deploymentId: string;

  @ApiProperty({
    description: 'Deep linking data passed in the initial request',
    example: 'some-data-string',
    required: false,
  })
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_DATA })
  data?: string;

  @ApiProperty({
    description: 'Content items selected by the user',
    type: [LtiResourceLinkDto],
  })
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_CONTENT_ITEMS })
  contentItems: LtiResourceLinkDto[];

  @ApiProperty({
    description: 'Message indicating the result of the deep linking request',
    example: 'Content items successfully selected',
    required: false,
  })
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_MESSAGE })
  message?: string;

  @ApiProperty({
    description: 'Log information for debugging purposes',
    example: 'Deep linking response processed successfully',
    required: false,
  })
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_LOG })
  log?: string;

  @ApiProperty({
    description:
      'Error message if the deep linking response indicates an error',
    example: 'An error occurred while processing the deep linking response',
    required: false,
  })
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_ERROR_MSG })
  errorMessage?: string;

  @ApiProperty({
    description: 'Detailed error log for debugging purposes',
    example: 'Stack trace or detailed error information',
    required: false,
  })
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_ERROR_LOG })
  errorLog?: string;

  constructor(partial: Partial<LtiDeepLinkingJwtPayloadDto>) {
    Object.assign(this, partial);
  }
}
