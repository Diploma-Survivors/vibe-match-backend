import { registerAs } from '@nestjs/config';

export const ltiConfig = registerAs('lti', () => ({
  platformId: process.env.LTI_PLATFORM_ID || 'http://localhost:8888',
  clientId: process.env.LTI_CLIENT_ID || 'xY7L64tSKtFBCn9',
  deploymentId: process.env.LTI_DEPLOYMENT_ID || '2',
  publicKeysetUrl:
    process.env.LTI_PUBLIC_KEYSET_URL ||
    'http://localhost:8888/mod/lti/certs.php',
  accessTokenUrl:
    process.env.LTI_ACCESS_TOKEN_URL ||
    'http://localhost:8888/mod/lti/token.php',
  authenticationRequestUrl:
    process.env.LTI_AUTHENTICATION_REQUEST_URL ||
    'http://localhost:8888/mod/lti/auth.php',
  toolUrl: process.env.LTI_TOOL_URL || 'http://host.docker.internal:3000',
  toolPublicKeysetUrl:
    process.env.LTI_TOOL_PUBLIC_KEYSET_URL ||
    'http://host.docker.internal:3000/v1/.well-known/jwks.json',
  toolInitiateLoginUrl:
    process.env.LTI_TOOL_INITIATE_LOGIN_URL ||
    'http://host.docker.internal:3000/v1/lti/login',
  toolRedirectionUri:
    process.env.LTI_TOOL_REDIRECTION_URI ||
    'http://host.docker.internal:3000/v1/lti/launch',
  frontendProblemUrl: {
    student:
      process.env.LTI_FRONTEND_STUDENT_PROBLEM_URL ||
      'http://localhost:3001/problems/{{CONTENT_ID}}/description',
    instructor:
      process.env.LTI_FRONTEND_INSTRUCTOR_PROBLEM_URL ||
      'http://localhost:3002/problems/{{CONTENT_ID}}',
  },
  frontendContestUrl: {
    student:
      process.env.LTI_FRONTEND_STUDENT_CONTEST_URL ||
      'http://localhost:3001/contests/{{CONTENT_ID}}',
    instructor:
      process.env.LTI_FRONTEND_INSTRUCTOR_CONTEST_URL ||
      'http://localhost:3002/contests/{{CONTENT_ID}}',
  },
  frontendSelectContentUrl:
    process.env.LTI_FRONTEND_SELECT_CONTENT_URL ||
    'http://localhost:3002/options',
  frontendSetCookiesUrl: {
    student:
      process.env.LTI_FRONTEND_STUDENT_SET_COOKIES_URL ||
      'http://localhost:3001/api/proxy/signin',
    instructor:
      process.env.LTI_FRONTEND_INSTRUCTOR_SET_COOKIES_URL ||
      'http://localhost:3002/api/proxy/signin',
  },
}));
