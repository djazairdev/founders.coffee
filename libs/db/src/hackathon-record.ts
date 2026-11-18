import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  events,
  hackathonCertificates,
  hackathons,
  hackathonSubmissions,
  markets,
  memberProfiles,
  projectMembers,
  projects,
} from './schema.js';

const RECORD_LIMIT = 100;

/**
 * The certificates a member's hackathon record is built from (B-PRF-05): those still standing, from
 * hackathons still published with their results out. Newest first.
 */
export const listHackathonRecordCertificates = (db: Db, userId: string) =>
  db
    .select({
      eventId: hackathonCertificates.eventId,
      title: events.title,
      slug: events.slug,
      marketCode: events.marketCode,
      marketSlug: markets.slug,
      kind: hackathonCertificates.kind,
      placement: hackathonCertificates.placement,
      verificationCode: hackathonCertificates.verificationCode,
      startsAt: events.startsAt,
    })
    .from(hackathonCertificates)
    .innerJoin(events, eq(events.id, hackathonCertificates.eventId))
    .innerJoin(hackathons, eq(hackathons.eventId, events.id))
    .innerJoin(markets, eq(markets.code, events.marketCode))
    .where(
      and(
        eq(hackathonCertificates.userId, userId),
        isNull(hackathonCertificates.revokedAt),
        eq(events.status, 'published'),
        isNotNull(hackathons.resultsPublishedAt),
      ),
    )
    .limit(RECORD_LIMIT);

/** The published projects from hackathon entries that list this member, by hackathon. */
export const listHackathonRecordProjects = (db: Db, userId: string) =>
  db
    .select({ eventId: hackathonSubmissions.eventId, slug: projects.slug })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .innerJoin(
      hackathonSubmissions,
      eq(hackathonSubmissions.id, projects.sourceSubmissionId),
    )
    .where(
      and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.isListed, true),
        eq(projects.status, 'published'),
      ),
    );

/**
 * The offer to show a hackathon on the member's profile (B-PRF-05): whether their record is shown
 * now, or `null` when they hold no standing certificate from this hackathon, so there is nothing to
 * offer: before its results, or after a disqualification.
 */
export const readHackathonRecordOffer = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<{ readonly isShown: boolean } | null> => {
  const [row] = await db
    .select({ isShown: memberProfiles.publishHackathonRecord })
    .from(hackathonCertificates)
    .leftJoin(
      memberProfiles,
      eq(memberProfiles.userId, hackathonCertificates.userId),
    )
    .where(
      and(
        eq(hackathonCertificates.eventId, input.eventId),
        eq(hackathonCertificates.userId, input.userId),
        isNull(hackathonCertificates.revokedAt),
      ),
    )
    .limit(1);
  return row ? { isShown: row.isShown ?? false } : null;
};

/**
 * Turn a member's hackathon record on or off. The revision moves, so a profile form opened before
 * this cannot silently put the old answer back. Returns whether the member has a profile to change.
 */
export const setPublishHackathonRecord = async (
  db: Db,
  input: { readonly userId: string; readonly isShown: boolean },
): Promise<boolean> => {
  const rows = await db
    .update(memberProfiles)
    .set({
      publishHackathonRecord: input.isShown,
      revision: sql`${memberProfiles.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(memberProfiles.userId, input.userId))
    .returning({ userId: memberProfiles.userId });
  return rows.length > 0;
};
