import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  Equals,
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import {
  LTI_CLAIMS,
  LTI_ROLES,
  LTI_VERSIONS,
} from '../constants/lti.constants';
import { LtiMessageType } from '../enums/lti-message-type.enum';
import { LtiContextDto } from './lti-context.dto';
import { LtiDeepLinkingSettingsClaimDto } from './lti-deep-linking-settings-claim.dto';
import { LtiLaunchPresentationDto } from './lti-launch-presentation.dto';
import { LtiToolPlatformDto } from './lti-tool-platform.dto';

export class IdTokenPayloadDto {
  @ApiProperty({
    description: 'Issuer identifier',
    example: 'https://lms.example.com',
  })
  @IsNotEmpty()
  @IsUrl({
    require_tld: process.env.NODE_ENV === 'production',
  })
  iss: string;

  @ApiProperty({
    description: 'Audience(s) that this ID token is intended for',
    example: ['client_id_12345', 'client_id_67890'],
  })
  @Transform(({ value }: { value: string | string[] }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsArray()
  @IsString({ each: true })
  aud: string[];

  @ApiProperty({
    description: 'LTI user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  sub: string;

  @ApiProperty({
    description: 'Expiration time of the ID token (as a Date object)',
    example: 1735689599,
  })
  @Transform(({ value }: { value: number }) => new Date(value * 1000))
  @IsNotEmpty()
  @IsDate()
  exp: Date;

  @ApiProperty({
    description: 'Issued at time of the ID token (as a Date object)',
    example: 1704153599,
  })
  @Transform(({ value }: { value: number }) => new Date(value * 1000))
  @IsNotEmpty()
  @IsDate()
  iat: Date;

  @ApiProperty({
    description: 'Nonce to associate a client session with the ID token',
    example: 'n-0S6_WzA2Mj',
  })
  @IsNotEmpty()
  @IsString()
  nonce: string;

  @ApiProperty({
    description:
      'Authorized party - the party to which the ID token was issued',
    example: 'client_id_12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  azp: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Picture URL of the user',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl({
    require_tld: process.env.NODE_ENV === 'production',
  })
  picture: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'LTI message type',
    enum: LtiMessageType,
  })
  @IsNotEmpty()
  @IsEnum(LtiMessageType, { message: 'Invalid LTI message type' })
  @Expose({ name: LTI_CLAIMS.MESSAGE_TYPE })
  messageType: LtiMessageType;

  @ApiProperty({
    description: 'LTI deployment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  @Expose({ name: LTI_CLAIMS.DEPLOYMENT_ID })
  deploymentId: string;

  @ApiProperty({
    description: 'Deep linking settings claim',
    type: () => LtiDeepLinkingSettingsClaimDto,
  })
  @IsNotEmptyObject()
  @Type(() => LtiDeepLinkingSettingsClaimDto)
  @ValidateNested()
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_SETTINGS })
  deepLinkingSettings: LtiDeepLinkingSettingsClaimDto;

  @ApiProperty({
    description: 'LTI launch presentation',
    type: () => LtiLaunchPresentationDto,
    required: false,
  })
  @IsOptional()
  @Type(() => LtiLaunchPresentationDto)
  @ValidateNested()
  @Expose({ name: LTI_CLAIMS.LAUNCH_PRESENTATION })
  launchPresentation?: LtiLaunchPresentationDto;

  @ApiProperty({
    description: 'LTI tool platform information',
    type: () => LtiToolPlatformDto,
    required: false,
  })
  @IsOptional()
  @Type(() => LtiToolPlatformDto)
  @ValidateNested()
  @Expose({ name: LTI_CLAIMS.TOOL_PLATFORM })
  platform: LtiToolPlatformDto;

  @ApiProperty({
    description: 'LTI context information',
    type: () => LtiContextDto,
    required: false,
  })
  @IsOptional()
  @Type(() => LtiContextDto)
  @ValidateNested()
  @Expose({ name: LTI_CLAIMS.CONTEXT })
  context: LtiContextDto;

  @ApiProperty({
    description: 'Roles of the user in the LTI context',
    type: [String],
    example: [LTI_ROLES.STUDENT, LTI_ROLES.INSTRUCTOR],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Expose({ name: LTI_CLAIMS.ROLES })
  roles: string[];

  @ApiProperty({
    description: 'User Ids of the mentors in the LTI context',
    type: [String],
    example: ['123fds23-123e4567-e89b-12d3-a456'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Expose({ name: LTI_CLAIMS.ROLE_SCOPE_MENTOR })
  roleScopeMentor: string[];

  @ApiProperty({
    description: 'LTI version',
    example: LTI_VERSIONS.V1_3,
  })
  @IsNotEmpty()
  @IsString()
  @Equals(LTI_VERSIONS.V1_3, { message: 'Unsupported LTI version' })
  @Expose({ name: LTI_CLAIMS.VERSION })
  version: string;

  @ApiProperty({
    description: 'Custom claims',
    type: Object,
    additionalProperties: true,
    example: {
      custom_key1: 'value1',
      custom_key2: 123,
      custom_key3: true,
    },
    required: false,
  })
  @IsOptional()
  @Expose({ name: LTI_CLAIMS.CUSTOM })
  customClaims: Record<string, any>;
}
