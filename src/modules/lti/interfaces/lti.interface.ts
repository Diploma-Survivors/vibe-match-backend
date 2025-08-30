import * as jose from 'jose';

export interface LtiContextClaim {
  id: string;
  label?: string;
  title?: string;
  type?: string[];
}

export interface LtiResourceLinkClaim {
  id: string;
  title?: string;
  description?: string;
}

export interface LtiAgsEndpointClaim {
  scope: string[];
  lineitems: string;
  lineitem: string;
}

export interface LtiNrpsNamesRoleServiceClaim {
  context_memberships_url: string;
  service_versions: string[];
}

export interface LtiDeepLinkingSettingsClaim {
  deep_link_return_url: string;
  accept_types: string[];
  accept_media_types?: string[];
  accept_presentation_document_targets?: string[];
  accept_multiple?: boolean;
  auto_create?: boolean;
  title?: string;
  text?: string;
}

export interface LtiClaims extends jose.JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  locale?: string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
  'https://purl.imsglobal.org/spec/lti/claim/version': string;
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  'https://purl.imsglobal.org/spec/lti/claim/context': LtiContextClaim;
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': LtiResourceLinkClaim;
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: {
    [key: string]: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'?: LtiAgsEndpointClaim;
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'?: LtiNrpsNamesRoleServiceClaim;
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'?: LtiDeepLinkingSettingsClaim;
}

export interface LtiLaunchResponse {
  cl;
  jwt: string;
  redirectPath: string;
}
