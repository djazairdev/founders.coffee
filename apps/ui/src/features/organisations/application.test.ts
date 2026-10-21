import { describe, expect, it } from 'vitest';

import {
  applicationFrom,
  emptyApplication,
  withMarket,
  withName,
  withSlug,
  withState,
  type ApplicationDraft,
} from './application';

const complete: ApplicationDraft = {
  ...emptyApplication('DZ'),
  name: 'Oran Makers',
  slug: 'oran-makers',
  kind: 'club',
  description: 'Builders who meet every month in Oran to show their work.',
};

describe('an organisation application draft (B-ORG-08)', () => {
  it('offers an address from the name until the applicant edits it', () => {
    const named = withName(emptyApplication('DZ'), 'École 42 Alger');
    expect(named.slug).toBe('ecole-42-alger');

    const edited = withSlug(named, 'Ecole42');
    expect(withName(edited, 'École 42 Oran').slug).toBe('ecole42');
  });

  it('clears the region and city when the country changes, and the city when the region does', () => {
    const placed = { ...complete, stateCode: '31', cityCode: '3101' };

    expect(withMarket(placed, 'EG')).toMatchObject({
      marketCode: 'EG',
      stateCode: '',
      cityCode: '',
    });
    expect(withState(placed, '16')).toMatchObject({
      stateCode: '16',
      cityCode: '',
    });
  });

  it('sends what the schema accepts, with no city and no website as null', () => {
    const checked = applicationFrom(complete);

    expect(checked).toEqual({
      ok: true,
      application: {
        name: 'Oran Makers',
        slug: 'oran-makers',
        kind: 'club',
        marketCode: 'DZ',
        cityCode: null,
        description:
          'Builders who meet every month in Oran to show their work.',
        websiteUrl: null,
      },
    });
  });

  it('takes a website typed without a scheme as https', () => {
    const checked = applicationFrom({
      ...complete,
      websiteUrl: 'oranmakers.dz',
    });

    expect(checked.ok && checked.application.websiteUrl).toBe(
      'https://oranmakers.dz',
    );
  });

  it('points at the first field, in the form’s order, that keeps it from being sent', () => {
    expect(applicationFrom(emptyApplication('DZ'))).toEqual({
      ok: false,
      field: 'name',
    });
    expect(applicationFrom({ ...complete, slug: 'admin' })).toEqual({
      ok: false,
      field: 'slug',
    });
    expect(applicationFrom({ ...complete, kind: '' })).toEqual({
      ok: false,
      field: 'kind',
    });
    expect(applicationFrom({ ...complete, description: 'Too short.' })).toEqual(
      { ok: false, field: 'description' },
    );
    expect(
      applicationFrom({ ...complete, websiteUrl: 'http://oranmakers.dz' }),
    ).toEqual({ ok: false, field: 'websiteUrl' });
  });
});
