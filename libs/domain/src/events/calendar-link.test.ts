import { describe, expect, it } from 'vitest';

import {
  googleCalendarUrlFor,
  icsFor,
  type CalendarEvent,
} from './calendar.js';

const LINK = 'https://meet.example.com/founders';

const ONLINE: CalendarEvent = {
  id: 'evt_25b03363854e4768887f4f96641e6667',
  title: 'Founders on a call',
  description: 'Pricing and first customers.',
  language: 'en',
  venue: null,
  venueAddress: null,
  latitude: null,
  longitude: null,
  startsAt: new Date('2026-10-02T17:00:00Z'),
  endsAt: new Date('2026-10-02T19:00:00Z'),
  version: 1,
  updatedAt: new Date('2026-09-24T08:15:30Z'),
  timezone: 'Africa/Algiers',
  url: 'https://founders.coffee/en/e/25b03363854e4768887f4f96641e6667',
};

const lines = (ics: string): string[] =>
  ics.replace(/\r\n /g, '').split('\r\n');

const valueOf = (ics: string, name: string): string | undefined =>
  lines(ics)
    .find((line) => line.startsWith(`${name}:`) || line.startsWith(`${name};`))
    ?.replace(/^[^:]*:/, '');

describe('the meeting link in a calendar entry (B-EVT-12)', () => {
  it('is where an online meetup takes place, for a reader given the link', () => {
    const ics = icsFor({ ...ONLINE, meetingLink: LINK });

    expect(valueOf(ics, 'LOCATION')).toBe('https://meet.example.com/founders');
    expect(valueOf(ics, 'DESCRIPTION')).toBe(
      `Pricing and first customers.\\n\\n${LINK}\\n\\n${ONLINE.url}`,
    );
  });

  it('stays beside the venue of a hybrid meetup', () => {
    const ics = icsFor({
      ...ONLINE,
      venue: 'Café des Délices',
      meetingLink: LINK,
    });

    expect(valueOf(ics, 'LOCATION')).toBe('Café des Délices');
    expect(valueOf(ics, 'DESCRIPTION')).toContain(LINK);
  });

  it('is nowhere in the entry of a reader without it', () => {
    const ics = icsFor({ ...ONLINE, meetingLink: null });

    expect(valueOf(ics, 'LOCATION')).toBeUndefined();
    expect(ics).not.toContain('meet.example.com');
  });

  it('reaches Google Calendar’s form too', () => {
    const params = new URL(
      googleCalendarUrlFor({ ...ONLINE, meetingLink: LINK }),
    ).searchParams;

    expect(params.get('location')).toBe(LINK);
    expect(params.get('details')).toContain(LINK);
  });
});
