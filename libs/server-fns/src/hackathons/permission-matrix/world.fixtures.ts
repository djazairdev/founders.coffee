import { id } from '@founders-coffee/core';
import {
  eq,
  events,
  hackathons as hackathonRows,
  member,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { signedInMember } from '../../profile/contact.fixtures.js';
import { ORGANISATION } from '../edit.fixtures.js';
import { ACTORS, type Actor } from './matrix.fixtures.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const PULL_REQUEST_URL = 'https://github.com/byte-club/ledger/pull/1';

export const MENTOR_NOTE = hackathons.hackathonMentorNoteSchema.parse({
  helpsWith: 'Payments and picking a first customer.',
  officeHours: 'Evenings, online.',
});

export type Extra =
  | 'teamRequest'
  | 'report'
  | 'project'
  | 'confirmedProject'
  | 'registeredMentor'
  | 'judgeAnswers'
  | 'mentorAnswers';

export type CastMember = {
  readonly userId: string;
  readonly headers: Headers;
};

export type Cast = Readonly<Record<Actor, CastMember>>;

export type World = {
  readonly eventId: string;
  readonly version: number;
  readonly organisationId: string;
  readonly details: hackathons.HackathonDetailsInput;
  readonly trackId: string;
  readonly criterionIds: readonly string[];
  readonly prizeId: string;
  readonly spareJudgeId: string;
  readonly spareMentorId: string;
  readonly answerTokens: Readonly<Partial<Record<Actor, string>>>;
  readonly teamId: string;
  readonly teamInviteToken: string;
  readonly requestId: string;
  readonly submissionId: string;
  readonly entryVersion: number;
  readonly projectId: string;
  readonly cast: Cast;
};

export type Ids = Omit<
  World,
  'details' | 'version' | 'criterionIds' | 'trackId'
>;

export const unwrap = <T>(
  result: { ok: true; data: T } | { ok: false; error: Error },
): T => {
  if (!result.ok) throw result.error;
  return result.data;
};

/**
 * Sign every actor in through Better Auth, so each holds a real session cookie, then make the
 * organiser a member of the organisation that leads every seeded hackathon and the admin an admin.
 * Everything else that makes an actor who they are belongs to a hackathon, so a seed does it.
 */
export const signInCast = async (db: Db): Promise<Cast> => {
  const signedIn: [Actor, CastMember][] = [];
  for (const actor of ACTORS) {
    const { userId, headers } = await signedInMember();
    signedIn.push([actor, { userId, headers }]);
  }
  const cast = Object.fromEntries(signedIn) as Record<Actor, CastMember>;
  await db
    .update(user)
    .set({ role: 'admin' })
    .where(eq(user.id, cast.admin.userId));
  await db.insert(member).values({
    id: id('mem'),
    organizationId: ORGANISATION,
    userId: cast.organiser.userId,
    role: 'member',
  });
  return cast;
};

const seconds = (offset: number) =>
  new Date(Math.floor((Date.now() + offset) / 1000) * 1000);

/** The dates that put a hackathon in a phase, in the order every phase depends on. */
export const moveDates = async (
  db: Db,
  eventId: string,
  [opens, closes, kickoff, deadline, ends, judgingEnds]: readonly number[],
) => {
  await db
    .update(events)
    .set({ startsAt: seconds(kickoff ?? 0), endsAt: seconds(ends ?? 0) })
    .where(eq(events.id, eventId));
  await db
    .update(hackathonRows)
    .set({
      registrationOpensAt: seconds(opens ?? 0),
      registrationClosesAt: seconds(closes ?? 0),
      submissionDeadlineAt: seconds(deadline ?? 0),
      judgingEndsAt: seconds(judgingEnds ?? 0),
    })
    .where(eq(hackathonRows.eventId, eventId));
};

export const OPEN_DATES = [-DAY, DAY, 2 * DAY, 3 * DAY, 3 * DAY, 4 * DAY];
export const BUILDING_DATES = [-3 * DAY, -2 * DAY, -DAY, DAY, DAY, 2 * DAY];
export const JUDGING_DATES = [-4 * DAY, -3 * DAY, -2 * DAY, -HOUR, HOUR, DAY];
export const JUDGED_DATES = [
  -5 * DAY,
  -4 * DAY,
  -3 * DAY,
  -2 * DAY,
  -2 * DAY,
  -HOUR,
];
