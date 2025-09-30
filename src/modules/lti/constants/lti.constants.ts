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
  TARGET_LINK_URI: 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri',
  LAUNCH_PRESENTATION:
    'https://purl.imsglobal.org/spec/lti/claim/launch_presentation',
  LIS: 'https://purl.imsglobal.org/spec/lti/claim/lis',
  ROLE_SCOPE_MENTOR:
    'https://purl.imsglobal.org/spec/lti/claim/role_scope_mentor',
  TOOL_PLATFORM: 'https://purl.imsglobal.org/spec/lti/claim/tool_platform',
  SESSION: 'https://purl.imsglobal.org/spec/lti/claim/session',
  DEEP_LINKING_DATA: 'https://purl.imsglobal.org/spec/lti-dl/claim/data',
  DEEP_LINKING_CONTENT_ITEMS:
    'https://purl.imsglobal.org/spec/lti-dl/claim/content_items',
  DEEP_LINKING_MESSAGE: 'https://purl.imsglobal.org/spec/lti-dl/claim/msg',
  DEEP_LINKING_LOG: 'https://purl.imsglobal.org/spec/lti-dl/claim/log',
  DEEP_LINKING_ERROR_MSG:
    'https://purl.imsglobal.org/spec/lti-dl/claim/errormsg',
  DEEP_LINKING_ERROR_LOG:
    'https://purl.imsglobal.org/spec/lti-dl/claim/errorlog',
};

export const LTI_MESSAGE_TYPES = {
  LTI_RESOURCE_LINK_REQUEST: 'LtiResourceLinkRequest',
  LTI_DEEP_LINKING_REQUEST: 'LtiDeepLinkingRequest',
  LTI_DEEP_LINKING_RESPONSE: 'LtiDeepLinkingResponse',
};

export const LTI_VERSIONS = {
  V1_3: '1.3.0',
};

/* NOSONAR */
export const LTI_ROLES = {
  STUDENT: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  INSTRUCTOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  TEACHING_ASSISTANT:
    'http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant',
};
/* NOSONAR */

export const LTI_ROLES_ARRAY = Object.values(LTI_ROLES);
