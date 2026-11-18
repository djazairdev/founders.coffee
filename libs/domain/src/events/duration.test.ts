import { describe, expect, it } from 'vitest';

import {
  EVENT_DURATION_MS_MAX,
  EVENT_DURATION_MS_MIN,
  eventDurationLimits,
  isEventDurationAllowed,
} from './duration.js';
import { eventCreateSchema, eventUpdateSchema } from './schemas.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('event duration by type', () => {
  it('gives meetups and workshops thirty minutes to eight hours', () => {
    for (const kind of ['meetup', 'workshop'] as const) {
      expect(eventDurationLimits(kind)).toEqual({
        minMs: 30 * MINUTE,
        maxMs: 8 * HOUR,
      });
      expect(isEventDurationAllowed(kind, 30 * MINUTE)).toBe(true);
      expect(isEventDurationAllowed(kind, 8 * HOUR)).toBe(true);
      expect(isEventDurationAllowed(kind, 30 * MINUTE - 1)).toBe(false);
      expect(isEventDurationAllowed(kind, 8 * HOUR + 1)).toBe(false);
    }
    expect(EVENT_DURATION_MS_MIN).toBe(30 * MINUTE);
    expect(EVENT_DURATION_MS_MAX).toBe(8 * HOUR);
  });

  it('lets a hackathon run up to fourteen days', () => {
    expect(eventDurationLimits('hackathon').maxMs).toBe(14 * DAY);
    expect(isEventDurationAllowed('hackathon', 8 * DAY)).toBe(true);
    expect(isEventDurationAllowed('hackathon', 14 * DAY)).toBe(true);
    expect(isEventDurationAllowed('hackathon', 14 * DAY + 1)).toBe(false);
    expect(isEventDurationAllowed('hackathon', 30 * MINUTE - 1)).toBe(false);
  });
});

describe('the event schemas apply the limits of the event’s type', () => {
  const startsAt = Date.now() + DAY;
  const fields = {
    title: 'Founder coffee session',
    description: 'A focused discussion for local founders.',
    venueName: 'Café des Délices',
    venueAddress: '12 Rue des Entrepreneurs, Alger',
    latitude: 36.7538,
    longitude: 3.0588,
    languages: ['fr'],
  };
  const base = { ...fields, marketCode: 'DZ', cityCode: '1' };

  it('refuses a workshop longer than eight hours, as it does a meetup', () => {
    const workshop = eventCreateSchema.safeParse({
      ...base,
      kind: 'workshop',
      startsAt,
      endsAt: startsAt + 9 * HOUR,
    });
    expect(workshop.success).toBe(false);
    expect(workshop.error?.issues.map((issue) => issue.message)).toContain(
      'Event duration must not exceed 480 minutes',
    );
    expect(
      eventCreateSchema.safeParse({
        ...base,
        startsAt,
        endsAt: startsAt + 9 * HOUR,
      }).success,
    ).toBe(false);
    expect(
      eventCreateSchema.safeParse({
        ...base,
        kind: 'workshop',
        startsAt,
        endsAt: startsAt + 8 * HOUR,
      }).success,
    ).toBe(true);
  });

  it('holds an edit that names no type to the meetup limits', () => {
    const edit = (endsAt: number) =>
      eventUpdateSchema.safeParse({
        ...fields,
        expectedVersion: 1,
        startsAt,
        endsAt,
      });
    expect(edit(startsAt + 2 * HOUR).success).toBe(true);
    expect(edit(startsAt + 2 * DAY).success).toBe(false);
  });
});
