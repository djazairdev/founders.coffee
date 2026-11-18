import { describe, expect, it } from 'vitest';

import { eventJsonLd, type StructuredEventData } from './seo-structured-data';

const HACKATHON: StructuredEventData = {
  title: 'Algiers Builders Hackathon',
  description: 'A week of building in teams.',
  startsAt: new Date('2099-01-22T09:00:00Z'),
  endsAt: new Date('2099-01-30T18:00:00Z'),
  createdAt: new Date('2098-12-01T08:00:00Z'),
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
  languages: ['ar', 'fr'],
  url: 'https://founders.coffee/fr/algeria/e/algiers-builders',
  currency: 'DZD',
  organizer: { name: 'Amina', url: 'https://founders.coffee/fr/u/usr_amina' },
  organisations: [
    {
      name: 'Algiers Builders',
      url: 'https://founders.coffee/fr/o/algiers-builders',
    },
  ],
  registration: {
    opensAt: new Date('2099-01-04T09:00:00Z'),
    closesAt: new Date('2099-01-20T23:00:00Z'),
  },
};

describe('a hackathon’s structured data (B-HKN-24)', () => {
  it('is an online Event with its dates, run by its organisation', () => {
    const schema = eventJsonLd(HACKATHON, Date.parse('2099-01-10T00:00:00Z'));

    expect(schema).toMatchObject({
      '@type': 'Event',
      startDate: '2099-01-22T10:00:00+01:00',
      endDate: '2099-01-30T19:00:00+01:00',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation' },
      organizer: {
        '@type': 'Organization',
        name: 'Algiers Builders',
        url: 'https://founders.coffee/fr/o/algiers-builders',
      },
    });
  });

  it('names every organisation that runs it, the lead first', () => {
    const schema = eventJsonLd({
      ...HACKATHON,
      organisations: [
        ...(HACKATHON.organisations ?? []),
        { name: 'Oran Devs', url: 'https://founders.coffee/fr/o/oran-devs' },
      ],
    });

    expect(schema.organizer).toEqual([
      expect.objectContaining({ name: 'Algiers Builders' }),
      expect.objectContaining({ '@type': 'Organization', name: 'Oran Devs' }),
    ]);
  });

  it('offers a seat from when registration opens until it closes', () => {
    expect(
      eventJsonLd(HACKATHON, Date.parse('2099-01-10T00:00:00Z')).offers,
    ).toMatchObject({
      price: 0,
      validFrom: '2099-01-04T10:00:00+01:00',
    });
    expect(
      eventJsonLd(HACKATHON, Date.parse('2099-01-21T00:00:00Z')).offers,
    ).toBeUndefined();
  });

  it('credits its host when no approved organisation runs it', () => {
    expect(eventJsonLd({ ...HACKATHON, organisations: [] }).organizer).toEqual({
      '@type': 'Person',
      name: 'Amina',
      url: 'https://founders.coffee/fr/u/usr_amina',
    });
  });
});
