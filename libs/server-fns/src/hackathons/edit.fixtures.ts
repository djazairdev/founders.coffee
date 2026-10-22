import { sql } from 'drizzle-orm';

import { eq, events, organization, type Db } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  setupDb,
  testMapProvider,
  TEST_HOST_ID,
} from '../events/resolver.fixtures.js';
import { saveHackathonDetailsResolver } from './details.js';
import { hackathonDraftResolver } from './draft-view.js';
import { createHackathonDraftResolver } from './draft.js';

export const DAY = 86_400_000;
export const HOUR = 3_600_000;
export const ORGANISATION = 'org_details_lead';

/** Turn hackathons on or off in DZ. */
export const setHackathons = (db: Db, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = 'DZ'`,
  );

/** A fresh database with hackathons on in DZ and an approved organisation to lead them. */
export const setupHackathonDb = async (): Promise<Db> => {
  const db = await setupDb();
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
  return db;
};

/** An online hackathon's event draft, kicking off in 30 days, at whole seconds as stored. */
export const draftHackathon = async (db: Db) => {
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

/** Details that fit a draft from {@link draftHackathon}, registration opening tomorrow. */
export const detailsFor = (
  kickoff: number,
  overrides: Record<string, unknown> = {},
) =>
  hackathons.hackathonDetailsSchema.parse({
    registrationOpensAt: Math.floor((Date.now() + DAY) / 1000) * 1000,
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

/** Publish a hackathon's event, as review will once it approves it, without moving its version. */
export const publishHackathon = (db: Db, eventId: string) =>
  db.update(events).set({ status: 'published' }).where(eq(events.id, eventId));

/** A drafted hackathon with its details saved, at the version that left it. */
export const hackathonWithDetails = async (
  db: Db,
  overrides: Record<string, unknown> = {},
  isPublished = false,
) => {
  const { eventId, kickoff } = await draftHackathon(db);
  const saved = await saveHackathonDetailsResolver(db, {
    eventId,
    version: 1,
    organisationId: ORGANISATION,
    details: detailsFor(kickoff, overrides),
  });
  if (!saved.ok) throw saved.error;
  if (isPublished) await publishHackathon(db, eventId);
  return { eventId, kickoff, version: saved.data.version };
};

export const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

export const BRIEF =
  'Build a tool that a founder in Algiers would use every week.';

export const founderTrack = (
  title: string,
): hackathons.HackathonTrackInput => ({
  kind: 'founder_problem',
  title,
  brief: BRIEF,
});

export const openSourceTrack: hackathons.HackathonTrackInput = {
  kind: 'open_source',
  title: 'Open source',
  brief: BRIEF,
  sourceUrls: ['https://github.com/djazairdev/founders.coffee'],
};

export const criterion = (
  name: string,
  weight: number,
): hackathons.HackathonCriterionInput => ({
  name,
  description: `How well the project does on ${name.toLowerCase()}.`,
  weight,
  scale: 10,
});

export const prize = (
  overrides: Partial<hackathons.HackathonPrizeInput> = {},
): hackathons.HackathonPrizeInput => ({
  trackId: null,
  place: 1,
  title: 'First prize',
  description: 'Mentoring and cloud credits for the winning team.',
  providerName: 'Algiers Builders',
  value: { amount_minor: 5_000_000, currency: 'DZD' },
  ...overrides,
});

export const readDraft = async (db: Db, eventId: string) => {
  const read = await hackathonDraftResolver(db, eventId);
  if (!read.ok) throw read.error;
  return read.data;
};

export const versionOf = (result: {
  ok: boolean;
  data?: { version: number };
}): number => {
  if (!result.ok || !result.data) throw new Error('The edit did not land');
  return result.data.version;
};

export const OPENED = {
  registrationOpensAt: Math.floor((Date.now() - DAY) / 1000) * 1000,
};

/** A row's id, failing the test when the row is not there. */
export const idOf = (row: { readonly id: string } | undefined): string => {
  if (!row) throw new Error('Expected a row');
  return row.id;
};
