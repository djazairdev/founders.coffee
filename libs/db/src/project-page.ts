import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { ProjectStage } from '@founders-coffee/core';

import type { Db } from './db.js';
import { lastSubmittedVersion } from './hackathon-submitted-version.js';
import { visibleIdentity } from './profile-access.js';
import {
  events,
  hackathonResults,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTracks,
  markets,
  projectMembers,
  projects,
  user,
  type Market,
} from './schema.js';

export type PublicProject = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly problem: string;
  readonly description: string;
  readonly stage: ProjectStage;
  readonly repositoryUrl: string | null;
  readonly demoUrl: string | null;
  readonly websiteUrl: string | null;
  readonly marketCode: string;
  readonly marketSlug: string;
  readonly timeZone: string;
  readonly isSearchIndexable: boolean;
  readonly updatedAt: Date;
  readonly hackathonTitle: string | null;
  readonly hackathonSlug: string | null;
  readonly trackTitle: string | null;
  readonly aiStatement: string | null;
  readonly rank: number | null;
  readonly trackRank: number | null;
};

/**
 * A published project as its page shows it (B-PRJ-03), with the hackathon it came from, the track and
 * AI statement of the version last submitted, and where the frozen results placed it. `null` for a
 * slug that is unknown, or a project still a draft or hidden. The hackathon's part is empty once its
 * entry is deleted, and the result's before the results are out.
 */
export const readPublicProject = async (
  db: Db,
  slug: string,
): Promise<PublicProject | null> => {
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      problem: projects.problem,
      description: projects.description,
      stage: projects.stage,
      repositoryUrl: projects.repositoryUrl,
      demoUrl: projects.demoUrl,
      websiteUrl: projects.websiteUrl,
      marketCode: projects.marketCode,
      marketSlug: markets.slug,
      timeZone: markets.timezone,
      isSearchIndexable: projects.isSearchIndexable,
      updatedAt: projects.updatedAt,
      hackathonTitle: events.title,
      hackathonSlug: events.slug,
      trackTitle: hackathonTracks.title,
      aiStatement: hackathonSubmissionVersions.aiStatement,
      rank: hackathonResults.rank,
      trackRank: hackathonResults.trackRank,
    })
    .from(projects)
    .innerJoin(markets, eq(markets.code, projects.marketCode))
    .leftJoin(
      hackathonSubmissions,
      eq(hackathonSubmissions.id, projects.sourceSubmissionId),
    )
    .leftJoin(events, eq(events.id, hackathonSubmissions.eventId))
    .leftJoin(
      hackathonSubmissionVersions,
      and(
        eq(hackathonSubmissionVersions.submissionId, hackathonSubmissions.id),
        lastSubmittedVersion,
      ),
    )
    .leftJoin(
      hackathonTracks,
      eq(hackathonTracks.id, hackathonSubmissionVersions.trackId),
    )
    .leftJoin(
      hackathonResults,
      and(
        eq(hackathonResults.submissionId, hackathonSubmissions.id),
        isNull(hackathonResults.disqualifiedAt),
      ),
    )
    .where(and(eq(projects.slug, slug), eq(projects.status, 'published')))
    .limit(1);
  return row ?? null;
};

/**
 * Who a project's page names (B-PRJ-03): the members who confirmed being listed and whose account
 * still stands, its owner first, then in the order they joined.
 */
export const listListedProjectMembers = (db: Db, projectId: string) =>
  db
    .select({ userId: projectMembers.userId, name: user.name })
    .from(projectMembers)
    .innerJoin(user, eq(user.id, projectMembers.userId))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.isListed, true),
        visibleIdentity(projectMembers.userId),
      ),
    )
    .orderBy(
      sql`${projectMembers.role} <> 'owner'`,
      asc(projectMembers.createdAt),
      asc(projectMembers.userId),
    );

/** The projects search engines may list (B-PRJ-03): published, with the team's search switch on. */
export const listIndexableProjects = (
  db: Db,
  marketStates: readonly Market['state'][],
) =>
  db
    .select({
      slug: projects.slug,
      marketCode: projects.marketCode,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .innerJoin(markets, eq(markets.code, projects.marketCode))
    .where(
      and(
        eq(projects.status, 'published'),
        eq(projects.isSearchIndexable, true),
        inArray(markets.state, [...marketStates]),
      ),
    )
    .orderBy(projects.slug);

const PROFILE_PROJECT_LIMIT = 20;

/**
 * The published projects a member confirmed being listed on, newest first, with where the frozen
 * results placed each (B-PRJ-05). The hackathon's part is empty once its entry is deleted, and the
 * result's before the results are out or after a disqualification.
 */
export const listProfileProjects = (db: Db, userId: string) =>
  db
    .select({
      slug: projects.slug,
      title: projects.title,
      stage: projects.stage,
      marketCode: projects.marketCode,
      hackathonTitle: events.title,
      rank: hackathonResults.rank,
      trackRank: hackathonResults.trackRank,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .leftJoin(
      hackathonSubmissions,
      eq(hackathonSubmissions.id, projects.sourceSubmissionId),
    )
    .leftJoin(events, eq(events.id, hackathonSubmissions.eventId))
    .leftJoin(
      hackathonResults,
      and(
        eq(hackathonResults.submissionId, hackathonSubmissions.id),
        isNull(hackathonResults.disqualifiedAt),
      ),
    )
    .where(
      and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.isListed, true),
        eq(projects.status, 'published'),
      ),
    )
    .orderBy(desc(projects.createdAt), desc(projects.id))
    .limit(PROFILE_PROJECT_LIMIT);
