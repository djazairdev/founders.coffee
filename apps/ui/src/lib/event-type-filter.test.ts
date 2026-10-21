import { describe, expect, it } from 'vitest';

import { market } from '../components/landing/city-landing.fixtures';
import {
  filterableTypes,
  landingCanonicalQuery,
  landingSearchSchema,
} from './event-type-filter';

describe('the landing search (B-EVT-05)', () => {
  it('keeps a known type beside a whole cursor', () => {
    expect(
      landingSearchSchema.parse({
        type: 'workshop',
        afterStartsAt: '1700000000000',
        afterId: 'evt_cursor',
      }),
    ).toEqual({
      type: 'workshop',
      afterStartsAt: 1700000000000,
      afterId: 'evt_cursor',
    });
  });

  it('names an unknown or missing type as undefined, so the router erases it', () => {
    for (const type of ['concert', '', 7, undefined]) {
      const parsed = landingSearchSchema.parse({ type });
      expect('type' in parsed).toBe(true);
      expect(parsed.type).toBeUndefined();
    }
  });

  it('offers hackathons only in a market that runs them', () => {
    expect(filterableTypes(market)).toEqual(['meetup', 'workshop']);
    expect(
      filterableTypes({
        featureFlags: { ...market.featureFlags, hackathons: true },
      }),
    ).toEqual(['meetup', 'workshop', 'hackathon']);
  });

  it('keeps the cursor on an unfiltered page’s canonical, and drops it for a filtered one', () => {
    const pagination = { afterStartsAt: 42, afterId: 'evt_1' };

    expect(landingCanonicalQuery(pagination, undefined)).toBe(
      'afterStartsAt=42&afterId=evt_1',
    );
    expect(landingCanonicalQuery(pagination, 'workshop')).toBeUndefined();
    expect(landingCanonicalQuery({}, 'meetup')).toBeUndefined();
  });
});
