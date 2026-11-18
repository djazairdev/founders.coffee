import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';
import { organisations } from '@founders-coffee/domain';

import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { organisationPageResolver } from './public-page.js';

const organisationPageSchema = z.strictObject({
  slug: organisations.organisationSlugLookupSchema,
});

export type OrganisationPageRequest = z.input<typeof organisationPageSchema>;

/** An approved organisation's public page, for anyone, signed in or not (B-ORG-11). */
export const getOrganisationPage = createServerFn({ strict: false })
  .validator(appValidator(organisationPageSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(organisationPageResolver(getDb(), data.slug));
  });
