import { describe, expect, it } from 'vitest';

import {
  applicationFrom,
  emptyApplication,
  type ApplicationDraft,
} from './application';

const complete: ApplicationDraft = {
  ...emptyApplication(),
  name: 'Oran Makers',
  kind: 'club',
  description: 'Builders who meet every month in Oran to show their work.',
};

describe('an organisation application draft (B-ORG-08)', () => {
  it('validates the profile without requesting an address or location', () => {
    expect(applicationFrom(complete)).toEqual({
      ok: true,
      application: {
        name: 'Oran Makers',
        kind: 'club',
        description:
          'Builders who meet every month in Oran to show their work.',
        websiteUrl: null,
      },
    });
  });

  it('accepts an Arabic name without requiring a Latin address', () => {
    const checked = applicationFrom({ ...complete, name: 'نادي البرمجة' });
    expect(checked.ok && checked.application.name).toBe('نادي البرمجة');
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

  it('points at the first field that keeps the profile from being saved', () => {
    expect(applicationFrom(emptyApplication())).toEqual({
      ok: false,
      field: 'name',
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
