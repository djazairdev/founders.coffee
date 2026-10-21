import { describe, expect, it } from 'vitest';

import { TOPICS } from '@founders-coffee/core';

import { PROFILE_INTERESTS } from '../profile/schemas.js';
import {
  EVENT_TAG_LIMIT,
  eventCreateSchema,
  eventTagsSchema,
  eventUpdateSchema,
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

describe('the topics of an event (B-EVT-06)', () => {
  it('draws on the one vocabulary members already choose their interests from', () => {
    expect(PROFILE_INTERESTS).toBe(TOPICS);
    expect(EVENT_TAG_LIMIT).toBe(5);
  });

  it('takes up to five topics, each once, from the vocabulary', () => {
    expect(eventTagsSchema.safeParse([]).success).toBe(true);
    expect(eventTagsSchema.safeParse(TOPICS.slice(0, 5)).success).toBe(true);
    expect(eventTagsSchema.safeParse(TOPICS.slice(0, 6)).success).toBe(false);
    expect(eventTagsSchema.safeParse(['product', 'product']).success).toBe(
      false,
    );
    expect(eventTagsSchema.safeParse(['blockchain']).success).toBe(false);
  });

  it('creates an event with no topics unless the host names some', () => {
    const plain = create();
    expect(plain.success && plain.data.tags).toEqual([]);

    const tagged = create({ tags: ['idea_validation', 'finding_customers'] });
    expect(tagged.success && tagged.data.tags).toEqual([
      'idea_validation',
      'finding_customers',
    ]);
    expect(create({ tags: TOPICS.slice(0, 6) }).success).toBe(false);
  });

  it('changes the topics only when an edit names them', () => {
    const untouched = update();
    expect(untouched.success && untouched.data.tags).toBeUndefined();

    const cleared = update({ tags: [] });
    expect(cleared.success && cleared.data.tags).toEqual([]);
    expect(update({ tags: ['investing', 'investing'] }).success).toBe(false);
  });
});
