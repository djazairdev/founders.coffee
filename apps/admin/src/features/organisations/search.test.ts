import { describe, expect, it } from 'vitest';

import { readOrganisationReviewSearch } from './search';

describe('the review queue’s address (B-ORG-06)', () => {
  it('opens on the first page of active organisers', () => {
    expect(readOrganisationReviewSearch({})).toEqual({
      status: 'approved',
      page: 0,
    });
  });

  it('keeps a status and page it knows', () => {
    expect(
      readOrganisationReviewSearch({ status: 'suspended', page: 2 }),
    ).toEqual({ status: 'suspended', page: 2 });
  });

  it('falls back on anything else', () => {
    expect(
      readOrganisationReviewSearch({ status: 'deleted', page: -1 }),
    ).toEqual({ status: 'approved', page: 0 });
    expect(readOrganisationReviewSearch({ page: 1.5 }).page).toBe(0);
    expect(readOrganisationReviewSearch({ page: 5000 }).page).toBe(0);
  });
});
