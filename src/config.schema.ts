import * as Joi from '@hapi/joi';

export const configValidationSchema = Joi.object({
  STAGE: Joi.string().required(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432).required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),

  STATS_SERVICE_BASE_URL: Joi.string().allow('').optional(),
  STATS_SERVICE_SLATE_GRADE_PATH: Joi.string().optional(),
  STATS_SERVICE_TIMEOUT_MS: Joi.number().optional(),
  STATS_SERVICE_API_KEY: Joi.string().allow('').optional(),
});
