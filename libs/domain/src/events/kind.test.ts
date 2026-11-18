import { describe, expect, it } from 'vitest';

import { EVENT_KINDS } from '@founders-coffee/core';

import {
  eventCreateSchema,
  eventUpdateSchema,
  MEMBER_EVENT_KINDS,
} from './schemas.js';

const startsAt = Date.UTC(2099, 0, 15, 18);
const create = (overrides: Record<string, unknown> = {}) =>
  eventCreateSchema.safeParse({
    marketCode: 'DZ',
    title: 'Founder coffee session',
    description: 'A focused discussion for local founders.',
    venueName: 'Café des Délices',
    venueAddress: '12 Rue des Entrepreneurs, Alger',
    latitude: 36.7538,
    longitude: 3.0588,
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
    venueName: 'Café des Délices',
    startsAt,
    endsAt: startsAt + 60 * 60_000,
    languages: ['fr'],
    ...overrides,
  });

describe('the kind of an event', () => {
  it('names three kinds, and leaves the hackathon out of what a member creates', () => {
    expect(EVENT_KINDS).toEqual(['meetup', 'workshop', 'hackathon']);
    expect(MEMBER_EVENT_KINDS).toEqual(['meetup', 'workshop']);
  });

  it('creates a meetup when no kind is given', () => {
    const result = create();
    expect(result.success && result.data.kind).toBe('meetup');
  });

  it('creates a workshop on request', () => {
    const result = create({ kind: 'workshop' });
    expect(result.success && result.data.kind).toBe('workshop');
  });

  it.each(['hackathon', 'conference', ''])(
    'refuses a member creating an event of kind %j',
    (kind) => {
      expect(create({ kind }).success).toBe(false);
    },
  );

  it('changes the kind of an event only when the edit names one', () => {
    const omitted = update();
    expect(omitted.success && omitted.data.kind).toBeUndefined();
    const changed = update({ kind: 'workshop' });
    expect(changed.success && changed.data.kind).toBe('workshop');
    expect(update({ kind: 'hackathon' }).success).toBe(false);
  });
});
