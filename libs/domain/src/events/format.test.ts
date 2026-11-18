import { describe, expect, it } from 'vitest';

import { eventMeetingUrlSchema } from './format.js';
import { eventCreateSchema, eventUpdateSchema } from './schemas.js';

const startsAt = Date.UTC(2099, 0, 15, 18);
const LINK = 'https://meet.example.com/founders';
const VENUE = {
  venueName: 'Café des Délices',
  venueAddress: '12 Rue des Entrepreneurs, Alger',
  latitude: 36.7538,
  longitude: 3.0588,
};

const create = (overrides: Record<string, unknown> = {}) =>
  eventCreateSchema.safeParse({
    marketCode: 'DZ',
    cityCode: '556',
    title: 'Founder coffee session',
    description: 'A focused discussion for local founders.',
    startsAt,
    endsAt: startsAt + 60 * 60_000,
    languages: ['fr'],
    ...overrides,
  });

const update = (overrides: Record<string, unknown> = {}) =>
  eventUpdateSchema.safeParse({
    expectedVersion: 1,
    title: 'Founder coffee session',
    description: 'A focused discussion for local founders.',
    startsAt,
    endsAt: startsAt + 60 * 60_000,
    languages: ['fr'],
    ...overrides,
  });

const pathsOf = (result: {
  readonly error?: {
    readonly issues: readonly { readonly path: readonly PropertyKey[] }[];
  };
}) => result.error?.issues.map((issue) => issue.path[0]) ?? [];

describe('the format rules of an event (B-EVT-09)', () => {
  it('creates an in-person event with a venue, and no format named means in person', () => {
    const result = create(VENUE);
    expect(result.success && result.data.format).toBe('in_person');
    expect(create({ ...VENUE, format: 'in_person' }).success).toBe(true);
  });

  it('refuses an in-person event without each part of its venue, or with a meeting link', () => {
    expect(pathsOf(create({ format: 'in_person' }))).toEqual([
      'venueName',
      'venueAddress',
      'latitude',
      'longitude',
    ]);
    expect(pathsOf(create({ ...VENUE, latitude: undefined }))).toEqual([
      'latitude',
    ]);
    expect(pathsOf(create({ ...VENUE, meetingUrl: LINK }))).toEqual([
      'meetingUrl',
    ]);
  });

  it('creates an online event with a meeting link and its city, and no venue', () => {
    const result = create({ format: 'online', meetingUrl: LINK });
    expect(result.success && result.data).toMatchObject({
      format: 'online',
      meetingUrl: LINK,
    });
  });

  it('refuses an online event without a link, with any part of a venue, or without its city', () => {
    expect(pathsOf(create({ format: 'online' }))).toEqual(['meetingUrl']);
    expect(
      pathsOf(
        create({
          format: 'online',
          meetingUrl: LINK,
          ...VENUE,
          venueProviderId: 'poi.1',
        }),
      ),
    ).toEqual([
      'venueName',
      'venueAddress',
      'venueProviderId',
      'latitude',
      'longitude',
    ]);
    expect(
      pathsOf(
        create({ format: 'online', meetingUrl: LINK, cityCode: undefined }),
      ),
    ).toEqual(['cityCode']);
  });

  it('creates a hybrid event only with both a venue and a link', () => {
    expect(
      create({ format: 'hybrid', meetingUrl: LINK, ...VENUE }).success,
    ).toBe(true);
    expect(pathsOf(create({ format: 'hybrid', ...VENUE }))).toEqual([
      'meetingUrl',
    ]);
    expect(pathsOf(create({ format: 'hybrid', meetingUrl: LINK }))).toEqual([
      'venueName',
      'venueAddress',
      'latitude',
      'longitude',
    ]);
  });

  it('takes only a credential-free HTTPS meeting link', () => {
    expect(eventMeetingUrlSchema.safeParse(` ${LINK} `).data).toBe(LINK);
    for (const link of [
      'http://meet.example.com/founders',
      'https://user:secret@meet.example.com/founders',
      'javascript:alert(1)',
      'meet.example.com/founders',
      `https://meet.example.com/${'a'.repeat(2048)}`,
    ])
      expect(eventMeetingUrlSchema.safeParse(link).success).toBe(false);
    expect(
      pathsOf(create({ format: 'online', meetingUrl: 'http://x.dz' })),
    ).toEqual(['meetingUrl']);
  });

  it('holds an edit that names its format to the same rules, keeping the stored point optional', () => {
    expect(update({ venueName: VENUE.venueName }).success).toBe(true);
    expect(
      update({ format: 'in_person', venueName: VENUE.venueName }).success,
    ).toBe(true);
    expect(pathsOf(update({ format: 'in_person' }))).toEqual(['venueName']);
    expect(
      pathsOf(
        update({
          format: 'in_person',
          venueName: VENUE.venueName,
          meetingUrl: LINK,
        }),
      ),
    ).toEqual(['meetingUrl']);
    expect(update({ format: 'online', meetingUrl: LINK }).success).toBe(true);
    expect(
      pathsOf(
        update({
          format: 'online',
          meetingUrl: LINK,
          venueName: VENUE.venueName,
        }),
      ),
    ).toEqual(['venueName']);
    expect(pathsOf(update({ format: 'hybrid', meetingUrl: LINK }))).toEqual([
      'venueName',
    ]);
    expect(
      update({
        format: 'hybrid',
        meetingUrl: LINK,
        venueName: VENUE.venueName,
      }).success,
    ).toBe(true);
  });
});
