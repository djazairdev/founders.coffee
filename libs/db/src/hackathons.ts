import { and, eq, sql, type SQL } from 'drizzle-orm';

import type { AttendanceMode, HackathonAiPolicy } from '@founders-coffee/core';

import type { Db } from './db.js';
import { hackathonAtVersion } from './hackathon-edits.js';
import { bound } from './insert-select.js';
import { events, hackathons, type Event, type Hackathon } from './schema.js';

export type HackathonDetails = {
  readonly rules: string | null;
  readonly minimumAge: number | null;
  readonly attendanceModes: readonly AttendanceMode[];
  readonly teamMin: number;
  readonly teamMax: number;
  readonly capacity: number | null;
  readonly registrationOpensAt: Date;
  readonly registrationClosesAt: Date;
  readonly submissionDeadlineAt: Date;
  readonly judgingEndsAt: Date;
  readonly aiPolicy: HackathonAiPolicy;
  readonly aiPolicyNote: string | null;
  readonly licenceNote: string | null;
};

/** Seconds since the epoch, the unit every timestamp column stores. */
const seconds = (date: Date): number => Math.floor(date.getTime() / 1000);

/** A hackathon's details as one row selected from its event's row, for an `INSERT … SELECT`. */
const detailsFromEvent = (
  db: Db,
  input: { readonly eventId: string; readonly details: HackathonDetails },
  isWritable: SQL,
) => {
  const { details } = input;
  return db
    .select({
      eventId: events.id,
      rules: bound(details.rules, 'rules'),
      minimumAge: bound(details.minimumAge, 'minimum_age'),
      attendanceModes: bound(
        JSON.stringify(details.attendanceModes),
        'attendance_modes',
      ),
      teamMin: bound(details.teamMin, 'team_min'),
      teamMax: bound(details.teamMax, 'team_max'),
      capacity: bound(details.capacity, 'capacity'),
      registrationOpensAt: bound(
        seconds(details.registrationOpensAt),
        'registration_opens_at',
      ),
      registrationClosesAt: bound(
        seconds(details.registrationClosesAt),
        'registration_closes_at',
      ),
      submissionDeadlineAt: bound(
        seconds(details.submissionDeadlineAt),
        'submission_deadline_at',
      ),
      judgingEndsAt: bound(seconds(details.judgingEndsAt), 'judging_ends_at'),
      aiPolicy: bound(details.aiPolicy, 'ai_policy'),
      aiPolicyNote: bound(details.aiPolicyNote, 'ai_policy_note'),
      licenceNote: bound(details.licenceNote, 'licence_note'),
      reviewStatus: sql<'draft'>`'draft'`.as('review_status'),
      reviewNote: bound(null, 'review_note'),
      resultsPublishedAt: bound(null, 'results_published_at'),
      createdAt: sql`unixepoch()`.as('created_at'),
      updatedAt: sql`unixepoch()`.as('updated_at'),
      registeredCount: bound(0, 'registered_count'),
    })
    .from(events)
    .where(
      and(
        eq(events.id, input.eventId),
        eq(events.kind, 'hackathon'),
        isWritable,
      ),
    );
};

/**
 * Write a hackathon's details, selected from its event's own row, so they are written only beside
 * an event of kind `hackathon` that exists: in the event's batch, an address that was taken writes
 * neither, and a meetup never gains them. A new hackathon starts as a `draft` for review.
 */
export const insertHackathonDetails = (
  db: Db,
  input: { readonly eventId: string; readonly details: HackathonDetails },
) => db.insert(hackathons).select(detailsFromEvent(db, input, sql`1`));

/**
 * The write that saves a hackathon's details from the organiser flow (B-HKN-12, B-HKN-07): inserted
 * the first time, replaced every time after, and only while the hackathon is at `version`, for
 * {@link applyHackathonEdit} to run with the version bump.
 */
export const hackathonDetailsWrite = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly details: HackathonDetails;
  },
) =>
  db
    .insert(hackathons)
    .select(
      detailsFromEvent(
        db,
        input,
        hackathonAtVersion(input.eventId, input.version),
      ),
    )
    .onConflictDoUpdate({
      target: hackathons.eventId,
      set: {
        rules: sql`excluded.rules`,
        minimumAge: sql`excluded.minimum_age`,
        attendanceModes: sql`excluded.attendance_modes`,
        teamMin: sql`excluded.team_min`,
        teamMax: sql`excluded.team_max`,
        capacity: sql`excluded.capacity`,
        registrationOpensAt: sql`excluded.registration_opens_at`,
        registrationClosesAt: sql`excluded.registration_closes_at`,
        submissionDeadlineAt: sql`excluded.submission_deadline_at`,
        judgingEndsAt: sql`excluded.judging_ends_at`,
        aiPolicy: sql`excluded.ai_policy`,
        aiPolicyNote: sql`excluded.ai_policy_note`,
        licenceNote: sql`excluded.licence_note`,
        updatedAt: sql`unixepoch()`,
      },
    });

/** A hackathon's event and its details, or `null` when the event is not a hackathon with details. */
export const getHackathon = async (
  db: Db,
  eventId: string,
): Promise<{ readonly event: Event; readonly hackathon: Hackathon } | null> => {
  const [row] = await db
    .select({ event: events, hackathon: hackathons })
    .from(hackathons)
    .innerJoin(events, eq(events.id, hackathons.eventId))
    .where(and(eq(hackathons.eventId, eventId), eq(events.kind, 'hackathon')))
    .limit(1);
  return row ?? null;
};
