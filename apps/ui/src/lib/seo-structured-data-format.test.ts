import { describe, expect, it } from 'vitest';

import { eventJsonLd, type StructuredEventData } from './seo-structured-data';

const EVENT: StructuredEventData = {
  title: 'Founders on a call',
  description: 'A meetup held online',
  startsAt: new Date('2099-09-20T10:00:00Z'),
  endsAt: new Date('2099-09-20T12:00:00Z'),
  createdAt: new Date('2026-09-01T08:30:00Z'),
  timezone: 'Africa/Algiers',
  status: 'published',
  format: 'online',
  venue: null,
  cityName: 'Alger',
  regionName: 'Alger',
  venueAddress: null,
  latitude: null,
  longitude: null,
  marketCode: 'DZ',
  languages: ['fr'],
  url: 'https://founders.coffee/fr/algeria/e/founders-call',
  currency: 'DZD',
  organizer: null,
};

describe('an event’s structured data by format (B-EVT-12)', () => {
  it('holds an online event online, at a virtual location with no link', () => {
    const schema = eventJsonLd(EVENT);

    expect(schema.eventAttendanceMode).toBe(
      'https://schema.org/OnlineEventAttendanceMode',
    );
    expect(schema.location).toEqual({ '@type': 'VirtualLocation' });
  });

  it('holds a hybrid event in its place and online at once', () => {
    const schema = eventJsonLd({
      ...EVENT,
      format: 'hybrid',
      venue: 'Café Atlas',
    });

    expect(schema.eventAttendanceMode).toBe(
      'https://schema.org/MixedEventAttendanceMode',
    );
    expect(schema.location).toEqual([
      expect.objectContaining({ '@type': 'Place', name: 'Café Atlas' }),
      { '@type': 'VirtualLocation' },
    ]);
  });

  it('keeps an in-person event offline, in its place', () => {
    const schema = eventJsonLd({
      ...EVENT,
      format: 'in_person',
      venue: 'Café Atlas',
    });

    expect(schema.eventAttendanceMode).toBe(
      'https://schema.org/OfflineEventAttendanceMode',
    );
    expect(schema.location).toMatchObject({ '@type': 'Place' });
  });
});
