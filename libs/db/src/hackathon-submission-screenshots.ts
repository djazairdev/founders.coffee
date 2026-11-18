import { and, asc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  captainBuilding,
  type SubmissionCaptain,
} from './hackathon-submission-drafts.js';
import { bound } from './insert-select.js';
import {
  hackathonJudges,
  hackathonRecusals,
  hackathons,
  hackathonSubmissions,
  hackathonSubmissionScreenshots as screenshots,
  hackathonTeamMembers,
} from './schema.js';

export type SubmissionScreenshotView = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
};

/** What counts against an entry's limit: its images, and reservations still in time. */
const countedAgainstLimit = (submissionId: string): SQL =>
  sql`(SELECT count(*) FROM ${screenshots} WHERE ${screenshots.submissionId} = ${submissionId} AND (${screenshots.status} = 'ready' OR (${screenshots.status} = 'pending' AND ${screenshots.expiresAt} > unixepoch())))`;

/**
 * Reserve a place for a screenshot, from the captain's own membership while the team is building
 * and the entry is under its limit, as one statement so two uploads cannot both take the last place.
 * Returns whether it was written.
 */
export const reserveSubmissionScreenshot = async (
  db: Db,
  input: SubmissionCaptain & {
    readonly id: string;
    readonly submissionId: string;
    readonly objectKey: string;
    readonly limit: number;
    readonly expiresAt: Date;
  },
): Promise<boolean> => {
  const result = await db.insert(screenshots).select(
    db
      .select({
        id: bound(input.id, 'id'),
        submissionId: hackathonSubmissions.id,
        eventId: hackathonSubmissions.eventId,
        teamId: hackathonSubmissions.teamId,
        objectKey: bound(input.objectKey, 'object_key'),
        status: sql<'pending'>`'pending'`.as('status'),
        width: bound(null, 'width'),
        height: bound(null, 'height'),
        expiresAt:
          sql<Date>`${Math.floor(input.expiresAt.getTime() / 1000)}`.as(
            'expires_at',
          ),
        createdAt: sql`unixepoch()`.as('created_at'),
      })
      .from(hackathonSubmissions)
      .where(
        and(
          eq(hackathonSubmissions.id, input.submissionId),
          eq(hackathonSubmissions.teamId, input.teamId),
          captainBuilding(input),
          sql`${hackathonSubmissions.status} <> 'disqualified'`,
          sql`${countedAgainstLimit(input.submissionId)} < ${input.limit}`,
        ),
      ),
  );
  return result.meta.changes > 0;
};

/** A reservation the member captains the team of, or `null`; it says where the bytes go. */
export const readCaptainScreenshot = async (
  db: Db,
  input: { readonly id: string; readonly userId: string },
) => {
  const [row] = await db
    .select({
      id: screenshots.id,
      eventId: screenshots.eventId,
      teamId: screenshots.teamId,
      submissionId: screenshots.submissionId,
      objectKey: screenshots.objectKey,
      status: screenshots.status,
      expiresAt: screenshots.expiresAt,
    })
    .from(screenshots)
    .innerJoin(
      hackathonTeamMembers,
      and(
        eq(hackathonTeamMembers.teamId, screenshots.teamId),
        eq(hackathonTeamMembers.userId, input.userId),
        eq(hackathonTeamMembers.isCaptain, true),
      ),
    )
    .where(eq(screenshots.id, input.id));
  return row ?? null;
};

/** Attach the stored image to its reservation; `false` when it was already used or removed. */
export const markSubmissionScreenshotReady = async (
  db: Db,
  input: {
    readonly id: string;
    readonly width: number;
    readonly height: number;
  },
): Promise<boolean> => {
  const result = await db
    .update(screenshots)
    .set({ status: 'ready', width: input.width, height: input.height })
    .where(
      and(eq(screenshots.id, input.id), eq(screenshots.status, 'pending')),
    );
  return result.meta.changes > 0;
};

/** Withdraw a screenshot from the entry; the sweep removes its bytes and then its row. */
export const removeSubmissionScreenshot = async (
  db: Db,
  input: SubmissionCaptain & { readonly id: string },
): Promise<boolean> => {
  const result = await db
    .update(screenshots)
    .set({ status: 'removed', expiresAt: new Date() })
    .where(
      and(
        eq(screenshots.id, input.id),
        eq(screenshots.teamId, input.teamId),
        eq(screenshots.eventId, input.eventId),
        eq(screenshots.status, 'ready'),
        captainBuilding(input),
      ),
    );
  return result.meta.changes > 0;
};

/** An entry's images, oldest first. */
export const listSubmissionScreenshots = async (
  db: Db,
  submissionId: string,
): Promise<readonly SubmissionScreenshotView[]> => {
  const rows = await db
    .select({
      id: screenshots.id,
      width: screenshots.width,
      height: screenshots.height,
    })
    .from(screenshots)
    .where(
      and(
        eq(screenshots.submissionId, submissionId),
        eq(screenshots.status, 'ready'),
      ),
    )
    .orderBy(asc(screenshots.createdAt), asc(screenshots.id));
  return rows.map((row) => ({
    id: row.id,
    width: row.width ?? 0,
    height: row.height ?? 0,
  }));
};

/**
 * The stored image, for someone allowed to see it: a member of the team, or an accepted judge of
 * the hackathon who has not recused from the entry, once judging has begun and only if it was
 * submitted. Anyone else, and an image no longer on the entry, gets `null`.
 */
export const readViewableScreenshot = async (
  db: Db,
  input: { readonly id: string; readonly userId: string },
) => {
  const isTeamMember = sql`EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${screenshots.teamId} AND ${hackathonTeamMembers.userId} = ${input.userId})`;
  const isJudge = sql`EXISTS (SELECT 1 FROM ${hackathonJudges} JOIN ${hackathons} ON ${hackathons.eventId} = ${hackathonJudges.eventId} JOIN ${hackathonSubmissions} ON ${hackathonSubmissions.id} = ${screenshots.submissionId} WHERE ${hackathonJudges.eventId} = ${screenshots.eventId} AND ${hackathonJudges.userId} = ${input.userId} AND ${hackathonJudges.status} = 'accepted' AND ${hackathonSubmissions.status} = 'submitted' AND ${hackathons.submissionDeadlineAt} <= unixepoch() AND NOT EXISTS (SELECT 1 FROM ${hackathonRecusals} WHERE ${hackathonRecusals.judgeId} = ${hackathonJudges.id} AND ${hackathonRecusals.submissionId} = ${screenshots.submissionId}))`;
  const [row] = await db
    .select({ eventId: screenshots.eventId, objectKey: screenshots.objectKey })
    .from(screenshots)
    .where(
      and(
        eq(screenshots.id, input.id),
        eq(screenshots.status, 'ready'),
        or(isTeamMember, isJudge),
      ),
    );
  return row ?? null;
};

/**
 * Screenshots nothing points at any more: removed, reserved and never used, or left behind by an
 * entry that went with its team. The table has no foreign key to the entry on purpose, because a
 * cascade would delete the row that names the object and strand the bytes in the bucket.
 */
export const listCollectableScreenshots = (db: Db, now: Date, limit: number) =>
  db
    .select({ id: screenshots.id, objectKey: screenshots.objectKey })
    .from(screenshots)
    .where(
      or(
        eq(screenshots.status, 'removed'),
        sql`${screenshots.status} = 'pending' AND ${screenshots.expiresAt} <= ${Math.floor(now.getTime() / 1000)}`,
        sql`NOT EXISTS (SELECT 1 FROM ${hackathonSubmissions} WHERE ${hackathonSubmissions.id} = ${screenshots.submissionId})`,
      ),
    )
    .limit(limit);

/** Delete rows whose objects are gone. */
export const deleteScreenshotRows = async (
  db: Db,
  ids: readonly string[],
): Promise<void> => {
  if (ids.length === 0) return;
  await db.delete(screenshots).where(inArray(screenshots.id, [...ids]));
};
