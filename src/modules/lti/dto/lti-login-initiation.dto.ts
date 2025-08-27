import { IsString } from 'class-validator';

export class LtiLoginInitiationDto {
  @IsString()
  iss: string;

  @IsString()
  login_hint: string;

  @IsString()
  target_link_uri: string;

  @IsString()
  lti_message_hint?: string;

  @IsString()
  client_id: string;

  @IsString()
  lti_deployment_id: string;
}
