import { beforeEach, describe, expect, it } from 'vitest';

import { hackathonPrizes, type Db } from '@founders-coffee/db';

import { setupHackathonDb } from '../hackathons/edit.fixtures.js';
import {
  readyHackathon,
  submittedHackathon,
} from '../hackathons/review.fixtures.js';
import { listHackathonReviewQueueResolver } from './hackathon-review.js';

let db: Db;

describe('the hackathon review queue (B-HKN-08, B-HKN-09, real D1)', () => {
  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  it('queues saved drafts and legacy submissions with what the reviewer needs', async () => {
    const { eventId } = await submittedHackathon(db);
    const { eventId: draftId } = await readyHackathon(db);
    await db.insert(hackathonPrizes).values({
      id: 'prz_review_first',
      eventId,
      trackId: null,
      place: 1,
      title: 'First prize',
      description: 'Mentoring and cloud credits for the winning team.',
      providerName: 'Algiers Builders',
      valueAmountMinor: 5_000_000,
      valueCurrency: 'DZD',
    });

    const queue = await listHackathonReviewQueueResolver(db, 0);
    if (!queue.ok) throw queue.error;
    const reviewed = queue.data.items.find((item) => item.eventId === eventId);

    expect(queue.data.items.map((item) => item.eventId).sort()).toEqual(
      [eventId, draftId].sort(),
    );
    expect(reviewed).toMatchObject({
      title: 'Algiers Builders Hackathon',
      organisation: { name: 'Algiers Builders', slug: 'algiers-builders' },
      timeZone: 'Africa/Algiers',
      teamMin: 2,
      teamMax: 4,
      format: 'online',
      venue: null,
      meetingUrl: 'https://meet.example.com/builders',
      languages: ['ar', 'fr'],
      attendanceModes: ['online'],
      aiPolicy: 'conditional',
      aiPolicyNote: 'Any assistant, named in the submission.',
      licenceNote: 'Teams keep what they build.',
      tracks: [
        expect.objectContaining({
          kind: 'founder_problem',
          title: 'Payments for cafés',
        }),
      ],
      prizes: [
        {
          id: 'prz_review_first',
          trackId: null,
          place: 1,
          title: 'First prize',
          description: 'Mentoring and cloud credits for the winning team.',
          providerName: 'Algiers Builders',
          value: { amount_minor: 5_000_000, currency: 'DZD' },
          isConfirmed: false,
        },
      ],
    });
    expect(
      reviewed?.criteria.map(({ name, weight }) => [name, weight]),
    ).toEqual([
      ['Impact', 40],
      ['Craft', 30],
      ['Demo', 30],
    ]);
    expect(draftId).not.toBe(eventId);
  });
});
