import { z } from 'zod';

import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_PROBLEM_MAX,
  PROJECT_SLUG_MAX,
  PROJECT_SLUG_MIN,
  PROJECT_TITLE_MAX,
  PROJECT_URL_MAX,
  projectStageSchema,
} from '@founders-coffee/core';

import { isCredentialFreeHttpsUrl } from '../profile/schemas.js';

export const projectSlugSchema = z
  .string()
  .min(PROJECT_SLUG_MIN)
  .max(PROJECT_SLUG_MAX)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

const projectUrlSchema = z
  .string()
  .trim()
  .max(PROJECT_URL_MAX)
  .refine(isCredentialFreeHttpsUrl, 'A credential-free HTTPS URL is required')
  .nullable()
  .default(null);

export const projectSchema = z.strictObject({
  title: z.string().trim().min(3).max(PROJECT_TITLE_MAX),
  problem: z.string().trim().min(20).max(PROJECT_PROBLEM_MAX),
  description: z.string().trim().max(PROJECT_DESCRIPTION_MAX).default(''),
  stage: projectStageSchema,
  repositoryUrl: projectUrlSchema,
  demoUrl: projectUrlSchema,
  websiteUrl: projectUrlSchema,
  isSearchIndexable: z.boolean().default(false),
});

export type ProjectInput = z.infer<typeof projectSchema>;
