import { and, count, eq, inArray, sql } from 'drizzle-orm';

import type {
  AttendanceMode,
  HackathonRegistrationStatus,
} from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { bound } from './insert-select.js';
import {
  events,
  hackathonJudges,
  hackathonRegistrations,
  hackathons,
} from './schema.js';

export type NewRegistration = {
  readonly id: string;
  readonly eventId: string;
  readonly userId: string;
  readonly attendanceMode: AttendanceMode;
  readonly ageAttestedAt: Date | null;
  readonly isLookingForTeam: boolean;
  readonly skills: string | null;
};

export type RegistrationWrite =
  | {
      readonly outcome: 'created';
      readonly status: 'registered' | 'waitlisted';
    }
  | { readonly outcome: 'already_registered' }
  | { readonly outcome: 'already_judge' }
  | { readonly outcome: 'registration_closed' };

const seconds = (date: Date): number => Math.floor(date.getTime() / 1000);

/** Count only participants who hold a confirmed place in each hackathon. */
export const countRegisteredHackathonParticipants = async (
  db: Db,
  eventIds: readonly string[],
): Promise<ReadonlyMap<string, number>> => {
  const uniqueEventIds = [...new Set(eventIds)];
  if (uniqueEventIds.length === 0) return new Map();
  const rows = await db
    .select({
      eventId: hackathonRegistrations.eventId,
      count: count(),
    })
    .from(hackathonRegistrations)
    .where(
      and(
        inArray(hackathonRegistrations.eventId, uniqueEventIds),
        eq(hackathonRegistrations.status, 'registered'),
      ),
    )
    .groupBy(hackathonRegistrations.eventId);
  return new Map(rows.map(({ eventId, count: total }) => [eventId, total]));
};

/**
 * Register a member for a hackathon in one atomic batch (B-REG-03, AGENTS.md §11).
 *
 * The registration is selected from the hackathon's own row, joined to its published event, and only
 * while registration is open, so a closed, unpublished or missing hackathon writes nothing. Whether it
 * holds a place or waits for one is decided in the same statement, against the count of places taken:
 * `registered` while that count is under the capacity, or always without one, `waitlisted` once it is
 * full. The count goes up in the batch's second statement, only for a row the first one wrote as
 * `registered`, so two members taking the last place serialise and one of them waits. An existing
 * registration of the member's, whatever its status, is left as it is, and a member who judges the
 * hackathon cannot take part in it (B-SAFE-04).
 */
export const createHackathonRegistration = async (
  db: Db,
  registration: NewRegistration,
): Promise<RegistrationWrite> => {
  const opens = hackathons.registrationOpensAt;
  const closes = hackathons.registrationClosesAt;
  const isNotJudge = sql`NOT EXISTS (SELECT 1 FROM ${hackathonJudges} WHERE ${hackathonJudges.eventId} = ${registration.eventId} AND ${hackathonJudges.userId} = ${registration.userId} AND ${hackathonJudges.status} = 'accepted')`;
  const [inserted] = await batch(db, [
    db
      .insert(hackathonRegistrations)
      .select(
        db
          .select({
            id: bound(registration.id, 'id'),
            eventId: hackathons.eventId,
            userId: bound(registration.userId, 'user_id'),
            status:
              sql<HackathonRegistrationStatus>`CASE WHEN ${hackathons.capacity} IS NULL OR ${hackathons.registeredCount} < ${hackathons.capacity} THEN 'registered' ELSE 'waitlisted' END`.as(
                'status',
              ),
            attendanceMode: bound(
              registration.attendanceMode,
              'attendance_mode',
            ),
            codeOfConductAcceptedAt: bound(null, 'code_of_conduct_accepted_at'),
            ageAttestedAt: bound(
              registration.ageAttestedAt && seconds(registration.ageAttestedAt),
              'age_attested_at',
            ),
            isLookingForTeam: bound(
              registration.isLookingForTeam ? 1 : 0,
              'looking_for_team',
            ),
            skills: bound(registration.skills, 'skills'),
            createdAt: sql`unixepoch()`.as('created_at'),
            updatedAt: sql`unixepoch()`.as('updated_at'),
          })
          .from(hackathons)
          .innerJoin(events, eq(events.id, hackathons.eventId))
          .where(
            and(
              eq(hackathons.eventId, registration.eventId),
              eq(events.kind, 'hackathon'),
              eq(events.status, 'published'),
              sql`${opens} <= unixepoch() AND ${closes} > unixepoch()`,
              isNotJudge,
            ),
          ),
      )
      .onConflictDoNothing(),
    db
      .update(hackathons)
      .set({ registeredCount: sql`${hackathons.registeredCount} + 1` })
      .where(
        and(
          eq(hackathons.eventId, registration.eventId),
          sql`exists (select 1 from ${hackathonRegistrations} where ${hackathonRegistrations.id} = ${registration.id} and ${hackathonRegistrations.status} = 'registered')`,
        ),
      ),
  ]);
  if (((inserted as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0) {
    const [row] = await db
      .select({ status: hackathonRegistrations.status })
      .from(hackathonRegistrations)
      .where(eq(hackathonRegistrations.id, registration.id));
    return {
      outcome: 'created',
      status: row?.status === 'registered' ? 'registered' : 'waitlisted',
    };
  }
  const [existing] = await db
    .select({ id: hackathonRegistrations.id })
    .from(hackathonRegistrations)
    .where(
      and(
        eq(hackathonRegistrations.eventId, registration.eventId),
        eq(hackathonRegistrations.userId, registration.userId),
      ),
    )
    .limit(1);
  if (existing) return { outcome: 'already_registered' };
  const [judge] = await db
    .select({ status: hackathonJudges.status })
    .from(hackathonJudges)
    .where(
      and(
        eq(hackathonJudges.eventId, registration.eventId),
        eq(hackathonJudges.userId, registration.userId),
      ),
    )
    .limit(1);
  return judge?.status === 'accepted'
    ? { outcome: 'already_judge' }
    : { outcome: 'registration_closed' };
};

/** Whether a member takes part in a hackathon, or waits to: registered or on its waitlist. */
export const holdsHackathonRegistration = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<boolean> => {
  const [row] = await db
    .select({ id: hackathonRegistrations.id })
    .from(hackathonRegistrations)
    .where(
      and(
        eq(hackathonRegistrations.eventId, input.eventId),
        eq(hackathonRegistrations.userId, input.userId),
        inArray(hackathonRegistrations.status, ['registered', 'waitlisted']),
      ),
    )
    .limit(1);
  return row !== undefined;
};

/** Whether a member holds a place in a hackathon: registered, not waiting, withdrawn or removed. */
export const isRegisteredParticipant = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<boolean> => {
  const [row] = await db
    .select({ id: hackathonRegistrations.id })
    .from(hackathonRegistrations)
    .where(
      and(
        eq(hackathonRegistrations.eventId, input.eventId),
        eq(hackathonRegistrations.userId, input.userId),
        eq(hackathonRegistrations.status, 'registered'),
      ),
    )
    .limit(1);
  return row !== undefined;
};

/**
 * A member's own registration for a hackathon, in whatever status it is, or `null` when they never
 * registered (B-REG-06). Only the member's own page reads it.
 */
export const readHackathonRegistration = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<{
  readonly status: HackathonRegistrationStatus;
  readonly attendanceMode: AttendanceMode;
} | null> => {
  const [row] = await db
    .select({
      status: hackathonRegistrations.status,
      attendanceMode: hackathonRegistrations.attendanceMode,
    })
    .from(hackathonRegistrations)
    .where(
      and(
        eq(hackathonRegistrations.eventId, input.eventId),
        eq(hackathonRegistrations.userId, input.userId),
      ),
    )
    .limit(1);
  return row ?? null;
};
