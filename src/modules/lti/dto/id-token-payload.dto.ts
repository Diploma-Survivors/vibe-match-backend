import { Expose, Transform, Type } from 'class-transformer';
import { LTI_CLAIMS } from '../constants/lti.constants';
import { ContentItemType } from '../enums/content-item-type.enum';
import { LtiContextType } from '../enums/lti-context-type.enum';
import { LtiMessageType } from '../enums/lti-message-type.enum';
import { PresentationTargetDocument } from '../enums/presentation-target-document.enum';

export class DeepLinkingSettingsClaim {
  @Expose({ name: 'deep_link_return_url' })
  deepLinkReturnUrl: string;

  @Expose({ name: 'accept_types' })
  acceptTypes: ContentItemType[];

  @Expose({ name: 'accept_presentation_document_targets' })
  acceptPresentationDocumentTargets?: PresentationTargetDocument[];

  @Expose({ name: 'accept_media_types' })
  acceptMediaTypes?: string[];

  @Expose({ name: 'accept_multiple' })
  acceptMultiple?: boolean;

  @Expose({ name: 'accept_line_item' })
  acceptLineItem?: boolean;

  @Expose({ name: 'auto_create' })
  autoCreate?: boolean;

  title?: string;

  text?: string;

  data?: string;
}

export class LaunchPresentationClaim {
  @Expose({ name: 'document_target' })
  documentTarget: PresentationTargetDocument;

  height: number;

  width: number;
}

export class ToolPlatformClaim {
  @Expose({ name: 'contact_email' })
  contactEmail?: string;

  description?: string;

  name?: string;

  url?: string;

  @Expose({ name: 'product_family_code' })
  productFamilyCode?: string;

  version: string;
}

export class ContextClaim {
  id: string;

  label: string;

  title: string;

  type: LtiContextType[];
}

export class ResourceLinkClaim {
  id: string;

  description?: string;

  title?: string;
}

export class IdTokenPayloadDto {
  iss: string;

  @Transform(({ value }: { value: string | string[] }) =>
    typeof value === 'string' ? [value] : value,
  )
  aud: string[];

  sub: string;

  @Transform(({ value }: { value: number }) => new Date(value * 1000))
  exp: Date;

  @Transform(({ value }: { value: number }) => new Date(value * 1000))
  iat: Date;

  nonce: string;

  azp: string;

  name: string;

  @Expose({ name: 'given_name' })
  givenName: string;

  @Expose({ name: 'family_name' })
  familyName: string;

  picture: string;

  email: string;

  @Expose({ name: LTI_CLAIMS.MESSAGE_TYPE })
  messageType: LtiMessageType;

  @Expose({ name: LTI_CLAIMS.DEPLOYMENT_ID })
  deploymentId: string;

  @Type(() => DeepLinkingSettingsClaim)
  @Expose({ name: LTI_CLAIMS.DEEP_LINKING_SETTINGS })
  deepLinkingSettings: DeepLinkingSettingsClaim;

  @Type(() => LaunchPresentationClaim)
  @Expose({ name: LTI_CLAIMS.LAUNCH_PRESENTATION })
  launchPresentation?: LaunchPresentationClaim;

  @Expose({ name: LTI_CLAIMS.TARGET_LINK_URI })
  targetLinkUri: string;

  @Type(() => ToolPlatformClaim)
  @Expose({ name: LTI_CLAIMS.TOOL_PLATFORM })
  platform: ToolPlatformClaim;

  @Type(() => ContextClaim)
  @Expose({ name: LTI_CLAIMS.CONTEXT })
  context: ContextClaim;

  @Type(() => ResourceLinkClaim)
  @Expose({ name: LTI_CLAIMS.RESOURCE_LINK })
  resourceLink: ResourceLinkClaim;

  @Expose({ name: LTI_CLAIMS.ROLES })
  roles: string[];

  @Expose({ name: LTI_CLAIMS.ROLE_SCOPE_MENTOR })
  roleScopeMentor: string[];

  @Expose({ name: LTI_CLAIMS.VERSION })
  version: string;

  @Expose({ name: LTI_CLAIMS.CUSTOM })
  customClaims: Record<string, any>;
}
