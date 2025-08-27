export const LTI_CLAIMS = {
  MESSAGE_TYPE: 'https://purl.imsglobal.org/spec/lti/claim/message_type',
  VERSION: 'https://purl.imsglobal.org/spec/lti/claim/version',
  ROLES: 'https://purl.imsglobal.org/spec/lti/claim/roles',
  CONTEXT: 'https://purl.imsglobal.org/spec/lti/claim/context',
  RESOURCE_LINK: 'https://purl.imsglobal.org/spec/lti/claim/resource_link',
  AGS_ENDPOINT: 'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint',
  NRPS_ENDPOINT:
    'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice',
  CUSTOM: 'https://purl.imsglobal.org/spec/lti/claim/custom',
  DEPLOYMENT_ID: 'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
  DEEP_LINKING_SETTINGS:
    'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings',
};

export const LTI_MESSAGE_TYPES = {
  LTI_RESOURCE_LINK_REQUEST: 'LtiResourceLinkRequest',
  LTI_DEEP_LINKING_REQUEST: 'LtiDeepLinkingRequest',
};

export const LTI_VERSIONS = {
  V1_3: '1.3.0',
};

export const LTI_ROLES = {
  STUDENT: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  INSTRUCTOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
};
