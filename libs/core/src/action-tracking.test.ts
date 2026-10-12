import { describe, expect, it } from 'vitest';
import {
  actionSchema,
  campaignFromSearch,
  campaignSearchSchema,
  isPrivateRequest,
} from './action-tracking.js';
import { communityHealthQuerySchema } from './community-health.js';

const action = {
  event: 'landing_view',
  page: 'market',
  locale: 'ar',
  market: 'DZ',
  attribution: {
    source: 'facebook',
    medium: 'paid_social',
    campaign: 'v90_founders_ar_v2',
  },
};
describe('anonymous action boundary', () => {
  it('rejects unknown events, identifiers, free text and oversized campaign codes', () => {
    for (const extra of [
      { userId: '123' },
      { url: 'https://example.test' },
      { event: 'purchase' },
      { attribution: { ...action.attribution, campaign: 'a'.repeat(65) } },
    ]) {
      expect(actionSchema.safeParse({ ...action, ...extra }).success).toBe(
        false,
      );
    }
    expect(actionSchema.safeParse(action).success).toBe(true);
  });
  it('retains only validated campaign fields and independently drops bad codes', () => {
    const search = new URLSearchParams(
      'utm_source=facebook&utm_medium=user@example.com&utm_campaign=v90&fbclid=secret',
    );
    expect(campaignFromSearch(search)).toEqual({
      source: 'facebook',
      medium: 'none',
      campaign: 'v90',
    });
    expect(campaignSearchSchema.parse(Object.fromEntries(search))).toEqual({
      utm_source: 'facebook',
      utm_medium: undefined,
      utm_campaign: 'v90',
    });
  });
  it('respects DNT and GPC at the server boundary', () => {
    expect(isPrivateRequest(new Headers({ DNT: '1' }))).toBe(true);
    expect(isPrivateRequest(new Headers({ 'Sec-GPC': '1' }))).toBe(true);
    expect(isPrivateRequest(new Headers())).toBe(false);
  });
  it('refuses invalid, future and unbounded community report windows', () => {
    const query = {
      market: 'DZ',
      from: '2026-01-01T00:00:00+01:00',
      to: '2026-02-01T00:00:00+01:00',
      asOf: '2026-03-01T00:00:00+01:00',
    };
    expect(communityHealthQuerySchema.safeParse(query).success).toBe(true);
    expect(
      communityHealthQuerySchema.safeParse({ ...query, to: query.from })
        .success,
    ).toBe(false);
    expect(
      communityHealthQuerySchema.safeParse({
        ...query,
        from: '2020-01-01T00:00:00Z',
      }).success,
    ).toBe(false);
    expect(
      communityHealthQuerySchema.safeParse({
        ...query,
        asOf: '2099-01-01T00:00:00Z',
      }).success,
    ).toBe(false);
  });
});
