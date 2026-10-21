import { describe, expect, it } from 'vitest';

import type { OrganisationView } from './api';
import {
  chosenHostOrganisation,
  hostableOrganisations,
} from './host-organisations';

const organisation = (
  overrides: Partial<OrganisationView> = {},
): OrganisationView => ({
  id: 'org_codeclub',
  name: 'Code Club Alger',
  slug: 'code-club-alger',
  kind: 'club',
  status: 'approved',
  marketCode: 'DZ',
  cityCode: null,
  description: 'Weekly coding evenings.',
  websiteUrl: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  role: 'member',
  ...overrides,
});

describe('the organisations a member can host as (B-EVT-18)', () => {
  it('keeps only approved organisations of the market', () => {
    expect(
      hostableOrganisations(
        [
          organisation(),
          organisation({ id: 'org_pending', status: 'pending' }),
          organisation({ id: 'org_rejected', status: 'rejected' }),
          organisation({ id: 'org_cairo', marketCode: 'EG' }),
        ],
        'DZ',
      ),
    ).toEqual([{ id: 'org_codeclub', name: 'Code Club Alger' }]);
    expect(hostableOrganisations(undefined, 'DZ')).toEqual([]);
  });

  it('falls back to the member for a choice they can no longer make', () => {
    const hostable = [{ id: 'org_codeclub', name: 'Code Club Alger' }];

    expect(chosenHostOrganisation('org_codeclub', hostable)).toEqual(
      hostable[0],
    );
    expect(chosenHostOrganisation('org_left', hostable)).toBeNull();
    expect(chosenHostOrganisation(null, hostable)).toBeNull();
  });
});
