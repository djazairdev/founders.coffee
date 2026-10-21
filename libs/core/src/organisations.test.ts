import { describe, expect, it } from 'vitest';

import {
  ORGANISATION_KINDS,
  ORGANISATION_STATUSES,
  organisationKindSchema,
  organisationStatusSchema,
} from './organisations.js';

describe('organisation contracts', () => {
  it.each([
    [ORGANISATION_KINDS, organisationKindSchema],
    [ORGANISATION_STATUSES, organisationStatusSchema],
  ] as const)('accepts exactly %j', (values, schema) => {
    for (const value of values)
      expect(schema.safeParse(value).success).toBe(true);
    expect(schema.safeParse('unknown').success).toBe(false);
  });
});
