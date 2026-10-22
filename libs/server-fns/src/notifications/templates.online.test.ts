import { describe, expect, it } from 'vitest';

import { LOCALES } from '@founders-coffee/i18n';

import { emailPayloadFor } from './email-templates.js';
import { placeValues, pushPayloadFor } from './templates.js';

const LINK = 'https://meet.example.com/founders?pwd=a1&room=2';

const valuesIn = (locale: (typeof LOCALES)[number], venue: string | null) => ({
  title: 'Coffee + Code',
  ...placeValues(venue, locale),
  address: venue ?? '',
  date: 'Friday, Jan 15',
  url: 'https://founders.coffee/en/algeria/e/coffee-code',
});

describe('where a message says the meetup happens (B-EVT-13)', () => {
  it.each([
    ['ar', 'في Café Atlas', 'عبر الإنترنت'],
    ['fr', 'à Café Atlas', 'en ligne'],
    ['en', 'at Café Atlas', 'online'],
  ] as const)(
    'reads at the venue or online in %s',
    (locale, atVenue, onlineWord) => {
      expect(placeValues('Café Atlas', locale).where).toBe(atVenue);
      expect(placeValues(null, locale)).toEqual({
        venue: '',
        where: onlineWord,
        isOnline: true,
      });
    },
  );

  it.each(LOCALES)(
    'tells an online meetup’s members it is online, never at a place, in %s',
    async (locale) => {
      const values = valuesIn(locale, null);
      for (const key of [
        'rsvp_confirmation',
        'reminder_24h',
        'event_rescheduled',
        'rsvp_received',
        'closeout_prompt',
        'feedback_invitation',
      ] as const) {
        const email = await emailPayloadFor(key, values, locale);
        expect(email.text, `${key} in ${locale}`).toContain(values.where);
        expect(email.text).not.toContain('{');
      }
    },
  );
});

describe('the meeting link in a member’s messages (B-EVT-13)', () => {
  it.each(['rsvp_confirmation', 'reminder_72h', 'reminder_24h'] as const)(
    'follows %s in its email body, with the query string escaped for the attribute',
    async (key) => {
      const email = await emailPayloadFor(
        key,
        { ...valuesIn('en', null), meetingLink: LINK },
        'en',
      );

      expect(email.html).toContain(
        'href="https://meet.example.com/founders?pwd=a1&amp;room=2"',
      );
      expect(email.text).toContain(`Join online: ${LINK}`);
      expect(email.subject).not.toContain('meet.example.com');
      const push = pushPayloadFor(
        key,
        { ...valuesIn('en', null), meetingLink: LINK },
        'en',
      );
      expect(
        `${push.pushTitle} ${push.pushBody} ${push.pushUrl}`,
      ).not.toContain('meet.example.com');
    },
  );

  it('stays out of every message about something else', async () => {
    for (const key of [
      'rsvp_received',
      'event_rescheduled',
      'event_cancelled',
      'feedback_invitation',
    ] as const) {
      const email = await emailPayloadFor(
        key,
        { ...valuesIn('en', null), meetingLink: LINK },
        'en',
      );
      expect(email.text, key).not.toContain('meet.example.com');
    }
  });

  it('keeps a confirmation’s calendar links after the meeting link', async () => {
    const email = await emailPayloadFor(
      'rsvp_confirmation',
      {
        ...valuesIn('en', null),
        meetingLink: LINK,
        calendar: {
          google: 'https://g.example/cal',
          ics: 'https://f.example/ics',
        },
      },
      'en',
    );

    expect(email.text.indexOf(LINK)).toBeLessThan(
      email.text.indexOf('https://f.example/ics'),
    );
    expect(email.text.endsWith('https://f.example/ics')).toBe(true);
  });
});

describe('the cancellation of an online meetup (B-EVT-13)', () => {
  it.each(LOCALES)('sends nobody anywhere, in %s', async (locale) => {
    const online = await emailPayloadFor(
      'event_cancelled',
      valuesIn(locale, null),
      locale,
    );
    const inPerson = await emailPayloadFor(
      'event_cancelled',
      valuesIn(locale, 'Café Atlas'),
      locale,
    );

    expect(online.text).not.toBe(inPerson.text);
    expect(inPerson.text).toContain('Café Atlas');
    expect(online.text).not.toContain('{');
    expect(online.subject).toBe(inPerson.subject);
  });

  it('reads as the online variant in English', async () => {
    const email = await emailPayloadFor(
      'event_cancelled',
      { ...valuesIn('en', null), reason: 'The speaker is ill.' },
      'en',
    );

    expect(email.text).toContain('scheduled online for Friday, Jan 15');
    expect(email.text).not.toContain('There is no need to go');
    expect(email.text).toContain('The speaker is ill.');
  });
});
