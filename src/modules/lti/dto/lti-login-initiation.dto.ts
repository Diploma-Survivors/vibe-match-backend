import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class LtiLoginInitiationDto {
  @ApiProperty({
    description: 'Issuer identifier for the LTI platform',
    example: 'http://localhost:8888',
  })
  @IsString()
  public readonly iss: string;

  @ApiProperty({
    description:
      'Hint to the tool about the login identifier for the user at the platform',
    example: 'testuser',
    name: 'login_hint',
  })
  @IsString()
  @Expose({ name: 'login_hint' })
  public readonly loginHint: string;

  @ApiProperty({
    description: 'The target link URI for the LTI launch',
    example: 'http://host.docker.internal:3000',
    name: 'target_link_uri',
  })
  @IsString()
  @Expose({ name: 'target_link_uri' })
  public readonly targetLinkUri: string;

  @ApiProperty({
    description:
      'Hint to the tool about the LTI message that will be sent after the OIDC login',
    example: '{ "cmid": 4, "launchid": "ltilaunch3_1337154575" }',
    required: false,
    name: 'lti_message_hint',
  })
  @IsString()
  @Expose({ name: 'lti_message_hint' })
  public readonly ltiMessageHint?: string;

  @ApiProperty({
    description: 'Client ID from the LTI platform',
    example: 'xY7L64tSKtFBCn9',
    name: 'client_id',
  })
  @IsString()
  @Expose({ name: 'client_id' })
  public readonly clientId: string;

  @ApiProperty({
    description: 'LTI Deployment ID from the LTI platform',
    example: '2',
    name: 'lti_deployment_id',
  })
  @IsString()
  @Expose({ name: 'lti_deployment_id' })
  public readonly ltiDeploymentId: string;
}
