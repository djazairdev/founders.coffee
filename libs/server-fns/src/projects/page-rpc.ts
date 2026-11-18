import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  appValidator,
  handleResult,
  PROJECT_SLUG_MAX,
} from '@founders-coffee/core';

import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { projectPageResolver } from './page.js';

const projectPageSchema = z.strictObject({
  slug: z.string().min(1).max(PROJECT_SLUG_MAX),
});

/** A published project's public page, for anyone, signed in or not (B-PRJ-03). */
export const getProjectPage = createServerFn({ strict: false })
  .validator(appValidator(projectPageSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(projectPageResolver(getDb(), data.slug));
  });
