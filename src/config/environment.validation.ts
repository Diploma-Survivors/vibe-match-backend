import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  // Application Configuration
  API_VERSION: Joi.string().default('v1'),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().required(),
  SWAGGER_ENDPOINT: Joi.string().default('api/docs'),
  CORS_ORIGINS: Joi.string().required(),
  // Database Configuration
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_AUTOLOAD: Joi.boolean().default(true),
  DATABASE_SYNC: Joi.boolean().default(false),
  DATABASE_MIGRATIONS_RUN: Joi.boolean().default(false),
  // Redis Configuration
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().allow('', null).optional(),
  REDIS_DB: Joi.number().required(),
  // JWT Configuration
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
  JWT_TOKEN_AUDIENCE: Joi.required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.number().required(),
  JWT_REFRESH_TOKEN_TTL: Joi.number().required(),
  // LTI Configuration
  LTI_PLATFORM_ID: Joi.string().uri().required(),
  LTI_CLIENT_ID: Joi.string().required(),
  LTI_DEPLOYMENT_ID: Joi.string().required(),
  LTI_PUBLIC_KEYSET_URL: Joi.string().uri().required(),
  LTI_ACCESS_TOKEN_URL: Joi.string().uri().required(),
  LTI_AUTHENTICATION_REQUEST_URL: Joi.string().uri().required(),
  LTI_TOOL_URL: Joi.string().uri().required(),
  LTI_TOOL_PUBLIC_KEYSET_URL: Joi.string().uri().required(),
  LTI_TOOL_INITIATE_LOGIN_URL: Joi.string().uri().required(),
  LTI_TOOL_REDIRECTION_URI: Joi.string().uri().required(),
  // AWS Configuration
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_REGION: Joi.string().required(),
  AWS_S3_BUCKET_NAME: Joi.string().required(),
  // LTI Frontend Callback URLS
  LTI_FRONTEND_STUDENT_CALLBACK_URL: Joi.string().uri().required(),
  LTI_FRONTEND_INSTRUCTOR_CALLBACK_URL: Joi.string().uri().required(),
  LTI_FRONTEND_DEEP_LINKING_URL: Joi.string().uri().required(),
  LTI_FRONTEND_STUDENT_SET_COOKIES_URL: Joi.string().uri().required(),
  LTI_FRONTEND_INSTRUCTOR_SET_COOKIES_URL: Joi.string().uri().required(),
  SUBMISSION_CLEANUP_STREAM_TIME: Joi.number().required(),
  SUBMISSION_PING_TIME: Joi.number().required(),
  JOB_ATTEMPTS: Joi.number().required(),
  JOB_BACKOFF_TYPE: Joi.string().required(),
  JOB_BACKOFF_DELAY: Joi.number().required(),
  JOB_REMOVE_ON_COMPLETE: Joi.boolean().required(),
  JOB_REMOVE_ON_FAIL: Joi.number().required(),
});
