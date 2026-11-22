import { beforeEach, describe, expect, it } from 'vitest';

import { eq, events, hackathonPrizes, type Db } from '@founders-coffee/db';

import {
  detailsFor,
  draftHackathon,
  ORGANISATION,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import {
  readyHackathon,
  submittedHackathon,
} from '../hackathons/review.fixtures.js';
import { saveHackathonDeadlinesResolver } from '../hackathons/details.js';
import { listHackathonReviewQueueResolver } from './hackathon-review-queue.js';

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
    expect(reviewed?.isComplete).toBe(true);
    if (!reviewed?.isComplete)
      throw new Error('The saved hackathon is incomplete');
    expect(reviewed).toMatchObject({
      title: 'Algiers Builders Hackathon',
      creatorEmail: 'resolve@test.coffee',
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

  it('includes blank and partially saved drafts without filling in missing values', async () => {
    const blank = await draftHackathon(db);
    const partial = await draftHackathon(db);
    const [partialEvent] = await db
      .select({ version: events.version })
      .from(events)
      .where(eq(events.id, partial.eventId));
    const deadlines = detailsFor(partial.kickoff);
    const saved = await saveHackathonDeadlinesResolver(db, {
      eventId: partial.eventId,
      version: partialEvent.version,
      organisationId: ORGANISATION,
      deadlines: {
        registrationOpensAt: deadlines.registrationOpensAt,
        registrationClosesAt: deadlines.registrationClosesAt,
        submissionDeadlineAt: deadlines.submissionDeadlineAt,
        judgingEndsAt: deadlines.judgingEndsAt,
      },
    });
    if (!saved.ok) throw saved.error;

    const queue = await listHackathonReviewQueueResolver(db, 0);
    if (!queue.ok) throw queue.error;
    const blankItem = queue.data.items.find(
      (item) => item.eventId === blank.eventId,
    );
    const partialItem = queue.data.items.find(
      (item) => item.eventId === partial.eventId,
    );

    expect(blankItem).toMatchObject({
      isComplete: false,
      creatorEmail: 'resolve@test.coffee',
      missingSections: ['deadlines', 'settings'],
      savedDeadlines: null,
      savedSettings: null,
    });
    expect(partialItem).toMatchObject({
      isComplete: false,
      missingSections: ['settings'],
      savedDeadlines: {
        registrationOpensAt: deadlines.registrationOpensAt,
        registrationClosesAt: deadlines.registrationClosesAt,
      },
      savedSettings: null,
    });
    expect(queue.data.items.map((item) => item.eventId)).toEqual(
      expect.arrayContaining([blank.eventId, partial.eventId]),
    );
  });
});
