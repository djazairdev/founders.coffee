import { describe, expect, it } from 'vitest';

import type { HostCreateDraft } from './host-create-draft';
import { hostCreatePayload } from './host-create-payload';

const cafe = {
  providerId: 'poi-cafe',
  kind: 'poi' as const,
  name: 'Founders Café',
  address: '12 Startup Street, Algiers',
  latitude: 36.7538,
  longitude: 3.0588,
};
const LINK = 'https://meet.example.org/founders';
const draft: HostCreateDraft = {
  step: 3,
  venue: cafe,
  venueName: 'Founders Café',
  searchValue: '',
  startsAt: 4_070_000_000_000,
  endsAt: 4_070_003_600_000,
  title: 'Founder meetup',
  description: 'A complete founder meetup description.',
  kind: 'meetup',
  chosenLanguages: null,
  hostAs: null,
  tags: ['product'],
  format: 'in_person',
  meetingUrl: LINK,
};
const where = { marketCode: 'DZ', cityCode: '556', languages: ['ar'] as const };

describe('the event a finished draft creates (B-EVT-10)', () => {
  it('sends an in-person meetup with its venue and no link', () => {
    const event = hostCreatePayload(draft, where);

    expect(event).toMatchObject({
      format: 'in_person',
      venueName: 'Founders Café',
      venueAddress: cafe.address,
      latitude: cafe.latitude,
      cityCode: '556',
    });
    expect(event).not.toHaveProperty('meetingUrl');
  });

  it('sends an online meetup with its link and city, and no venue at all', () => {
    const event = hostCreatePayload(
      { ...draft, format: 'online', meetingUrl: ` ${LINK} ` },
      where,
    );

    expect(event).toMatchObject({
      format: 'online',
      meetingUrl: LINK,
      cityCode: '556',
    });
    for (const field of [
      'venueName',
      'venueAddress',
      'venueProviderId',
      'latitude',
      'longitude',
    ])
      expect(event).not.toHaveProperty(field);
  });

  it('sends a hybrid meetup with both', () => {
    expect(
      hostCreatePayload({ ...draft, format: 'hybrid' }, where),
    ).toMatchObject({
      format: 'hybrid',
      meetingUrl: LINK,
      venueName: 'Founders Café',
    });
  });

  it('sends nothing while the format still lacks something', () => {
    expect(
      hostCreatePayload(
        { ...draft, format: 'online' },
        { ...where, cityCode: undefined },
      ),
    ).toBeNull();
    expect(
      hostCreatePayload({ ...draft, format: 'hybrid', meetingUrl: '' }, where),
    ).toBeNull();
    expect(hostCreatePayload({ ...draft, venue: null }, where)).toBeNull();
    expect(hostCreatePayload({ ...draft, startsAt: null }, where)).toBeNull();
  });
});
