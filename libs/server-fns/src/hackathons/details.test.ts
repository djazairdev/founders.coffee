import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import {
  eq,
  events,
  hackathons as hackathonDetails,
  organization,
  readHackathonLeadOrganisation,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  setupDb,
  testMapProvider,
  TEST_HOST_ID,
} from '../events/resolver.fixtures.js';
import { hostAnEvent } from '../events/update.fixtures.js';
import {
  hackathonDraftResolver,
  saveHackathonDetailsResolver,
} from './details.js';
import { createHackathonDraftResolver } from './draft.js';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ORGANISATION = 'org_details_lead';

const setHackathons = (db: Db, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = 'DZ'`,
  );

const draftHackathon = async (db: Db) => {
  const kickoff = Math.floor((Date.now() + 30 * DAY) / 1000) * 1000;
  const created = await createHackathonDraftResolver(db, testMapProvider, {
    hostId: TEST_HOST_ID,
    organisationId: ORGANISATION,
    basics: hackathons.hackathonBasicsSchema.parse({
      marketCode: 'DZ',
      cityCode: '1',
      title: 'Algiers Builders Hackathon',
      description: 'Two days of building with founders across Algiers.',
      format: 'online',
      meetingUrl: 'https://meet.example.com/builders',
      startsAt: kickoff,
      endsAt: kickoff + 2 * DAY,
      languages: ['ar', 'fr'],
    }),
  });
  if (!created.ok) throw created.error;
  return { eventId: created.data.eventId, kickoff };
};

const detailsFor = (kickoff: number, overrides: Record<string, unknown> = {}) =>
  hackathons.hackathonDetailsSchema.parse({
    registrationOpensAt: Date.now() + DAY,
    registrationClosesAt: kickoff - DAY,
    submissionDeadlineAt: kickoff + 2 * DAY - HOUR,
    judgingEndsAt: kickoff + 9 * DAY,
    attendanceModes: ['online'],
    teamMin: 2,
    teamMax: 4,
    aiPolicy: 'ai_native',
    aiPolicyNote: 'Any assistant, named in the submission.',
    licenceNote: 'Teams keep what they build.',
    ...overrides,
  });

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe("a hackathon's second step (B-HKN-12, real D1)", () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
    await db
      .insert(organization)
      .values({
        id: ORGANISATION,
        name: 'Algiers Builders',
        slug: 'algiers-builders',
        kind: 'club',
        status: 'approved',
        marketCode: 'DZ',
        description: 'A club that runs hackathons for students in Algiers.',
      })
      .onConflictDoNothing();
  });

  it('reads a draft without details, and names its lead', async () => {
    const { eventId, kickoff } = await draftHackathon(db);

    const read = await hackathonDraftResolver(db, eventId);
    if (!read.ok) throw read.error;
    expect(read.data).toMatchObject({
      event: {
        id: eventId,
        title: 'Algiers Builders Hackathon',
        format: 'online',
        status: 'draft',
        startsAt: kickoff,
        endsAt: kickoff + 2 * DAY,
      },
      organisation: {
        id: ORGANISATION,
        name: 'Algiers Builders',
        slug: 'algiers-builders',
      },
      details: null,
      isEditable: true,
    });
    expect(await readHackathonLeadOrganisation(db, eventId)).toBe(ORGANISATION);
  });

  it('writes the details the first time and replaces them after', async () => {
    const { eventId, kickoff } = await draftHackathon(db);

    const first = await saveHackathonDetailsResolver(db, {
      eventId,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff),
    });
    expect(first.ok).toBe(true);
    const second = await saveHackathonDetailsResolver(db, {
      eventId,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, {
        teamMax: 5,
        capacity: 80,
        minimumAge: 18,
        aiPolicyNote: undefined,
      }),
    });
    expect(second.ok).toBe(true);

    const read = await hackathonDraftResolver(db, eventId);
    if (!read.ok) throw read.error;
    expect(read.data.details).toMatchObject({
      attendanceModes: ['online'],
      teamMin: 2,
      teamMax: 5,
      capacity: 80,
      minimumAge: 18,
      aiPolicy: 'ai_native',
      aiPolicyNote: null,
      licenceNote: 'Teams keep what they build.',
      registrationClosesAt: kickoff - DAY,
    });
    expect(
      await db
        .select({ status: hackathonDetails.reviewStatus })
        .from(hackathonDetails)
        .where(eq(hackathonDetails.eventId, eventId)),
    ).toEqual([{ status: 'draft' }]);
  });

  it('holds the details to the saved event, and writes nothing that does not fit', async () => {
    const { eventId, kickoff } = await draftHackathon(db);

    const late = await saveHackathonDetailsResolver(db, {
      eventId,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, { registrationClosesAt: kickoff + HOUR }),
    });
    const inPerson = await saveHackathonDetailsResolver(db, {
      eventId,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, { attendanceModes: ['in_person'] }),
    });

    expect(codeOf(late)).toBe('validation_failed');
    expect(codeOf(inPerson)).toBe('validation_failed');
    expect(
      await db
        .select({ id: hackathonDetails.eventId })
        .from(hackathonDetails)
        .where(eq(hackathonDetails.eventId, eventId)),
    ).toEqual([]);
  });

  it('leaves a hackathon that moved on from its draft alone', async () => {
    const { eventId, kickoff } = await draftHackathon(db);
    await db
      .update(events)
      .set({ status: 'published' })
      .where(eq(events.id, eventId));

    const saved = await saveHackathonDetailsResolver(db, {
      eventId,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff),
    });
    const read = await hackathonDraftResolver(db, eventId);

    expect(codeOf(saved)).toBe('hackathon_not_editable');
    expect(read.ok && read.data.isEditable).toBe(false);
  });

  it('answers not found for a meetup, and closes with the market', async () => {
    const meetup = await hostAnEvent(db, { title: 'A plain meetup' });
    const { eventId, kickoff } = await draftHackathon(db);

    expect(codeOf(await hackathonDraftResolver(db, meetup.id))).toBe(
      'event_not_found',
    );
    expect(await readHackathonLeadOrganisation(db, meetup.id)).toBeNull();

    await setHackathons(db, false);
    expect(codeOf(await hackathonDraftResolver(db, eventId))).toBe(
      'hackathons_disabled',
    );
    expect(
      codeOf(
        await saveHackathonDetailsResolver(db, {
          eventId,
          organisationId: ORGANISATION,
          details: detailsFor(kickoff),
        }),
      ),
    ).toBe('hackathons_disabled');
  });
});
