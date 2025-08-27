import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  // Database Configuration
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USERNAME: Joi.string().required(),
  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  // JWT Configuration
  JWT_SECRET: Joi.string().required(),
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
});
