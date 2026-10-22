import { beforeEach, describe, expect, it } from 'vitest';

import {
  firstInvalidField,
  focusInvalidField,
  ONLINE_CITY_ID,
  ONLINE_REGION_ID,
  restoredDraftStep,
  validatePlaceStep,
} from './host-create-validation';
import type { HostCreateDraft } from './host-create-draft';

const cafe = {
  providerId: 'poi-cafe',
  kind: 'poi' as const,
  name: 'Founders Café',
  address: '12 Startup Street, Algiers',
  latitude: 36.7538,
  longitude: 3.0588,
};
const place = {
  format: 'in_person' as const,
  venue: cafe,
  venueName: 'Founders Café',
  meetingUrl: '',
  cityCode: undefined,
};
const LINK = 'https://meet.example.org/founders';

describe('the first step for each format (B-EVT-10)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('asks an in-person meetup for its venue only', () => {
    expect(validatePlaceStep(place, 'en')).toEqual({});
    expect(validatePlaceStep({ ...place, venue: null }, 'en')).toEqual({
      venue: null,
    });
    expect(
      validatePlaceStep({ ...place, meetingUrl: 'not a link' }, 'en'),
    ).toEqual({});
  });

  it('asks an online meetup for its link and city, never a venue', () => {
    const online = { ...place, format: 'online' as const, venue: null };

    expect(validatePlaceStep(online, 'en')).toEqual({
      meetingUrl: null,
      city: null,
    });
    expect(
      validatePlaceStep({ ...online, meetingUrl: LINK, cityCode: '556' }, 'en'),
    ).toEqual({});
  });

  it('says why a link cannot be used', () => {
    const check = validatePlaceStep(
      {
        ...place,
        format: 'online',
        meetingUrl: 'http://meet.example.org',
        cityCode: '556',
      },
      'en',
    );

    expect(check.meetingUrl).toMatch(/https/);
  });

  it('asks a hybrid meetup for the link first, then the venue', () => {
    const check = validatePlaceStep(
      { ...place, format: 'hybrid', venue: null },
      'en',
    );

    expect(check).toEqual({ meetingUrl: null, venue: null });
    expect(firstInvalidField(check)).toBe('meetingUrl');
  });

  it('takes the host to the region, or to the city once a region is chosen', () => {
    document.body.innerHTML = `
      <select id="${ONLINE_REGION_ID}"><option>x</option></select>
      <select id="${ONLINE_CITY_ID}" disabled><option>y</option></select>`;
    focusInvalidField('city');
    expect(document.activeElement?.id).toBe(ONLINE_REGION_ID);

    document.getElementById(ONLINE_CITY_ID)?.removeAttribute('disabled');
    focusInvalidField('city');
    expect(document.activeElement?.id).toBe(ONLINE_CITY_ID);
  });

  it('sends a restored online draft back to the first step until it has a city', () => {
    const draft: HostCreateDraft = {
      step: 3,
      venue: null,
      venueName: '',
      searchValue: '',
      startsAt: new Date('2099-01-15T18:00:00Z').getTime(),
      endsAt: new Date('2099-01-15T19:00:00Z').getTime(),
      title: 'Founder meetup',
      description: 'A complete founder meetup description.',
      kind: 'meetup',
      chosenLanguages: null,
      hostAs: null,
      tags: [],
      format: 'online',
      meetingUrl: LINK,
    };

    expect(restoredDraftStep(draft, undefined, 'en')).toBe(1);
    expect(restoredDraftStep(draft, '556', 'en')).toBe(3);
  });
});
