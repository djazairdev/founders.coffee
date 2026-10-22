import { asc, eq } from 'drizzle-orm';

import type { HackathonTrackKind } from '@founders-coffee/core';

import type { Db } from './db.js';
import type { TeamSubmissionEntry } from './hackathon-submission-submit.js';
import {
  hackathonSubmissions,
  hackathonTeams,
  hackathonTracks,
} from './schema.js';

export type SubmissionPageRows = {
  readonly tracks: readonly {
    readonly id: string;
    readonly title: string;
    readonly kind: HackathonTrackKind;
  }[];
  readonly teamName: string | null;
  readonly entry:
    (TeamSubmissionEntry & { readonly submittedAt: Date | null }) | null;
};

/**
 * What a team's submission page shows (B-SUB-05), in one trip to D1: the hackathon's tracks in
 * their order, the team's name, and the team's entry as it stands, or `null` before its first save.
 */
export const readSubmissionPageRows = async (
  db: Db,
  input: { readonly eventId: string; readonly teamId: string },
): Promise<SubmissionPageRows> => {
  const [tracks, teams, entries] = await db.batch([
    db
      .select({
        id: hackathonTracks.id,
        title: hackathonTracks.title,
        kind: hackathonTracks.kind,
      })
      .from(hackathonTracks)
      .where(eq(hackathonTracks.eventId, input.eventId))
      .orderBy(asc(hackathonTracks.position)),
    db
      .select({ name: hackathonTeams.name })
      .from(hackathonTeams)
      .where(eq(hackathonTeams.id, input.teamId)),
    db
      .select({
        id: hackathonSubmissions.id,
        status: hackathonSubmissions.status,
        version: hackathonSubmissions.version,
        trackId: hackathonSubmissions.trackId,
        title: hackathonSubmissions.title,
        description: hackathonSubmissions.description,
        repositoryUrl: hackathonSubmissions.repositoryUrl,
        demoVideoUrl: hackathonSubmissions.demoVideoUrl,
        pullRequestUrls: hackathonSubmissions.pullRequestUrls,
        aiTools: hackathonSubmissions.aiTools,
        aiStatement: hackathonSubmissions.aiStatement,
        submittedAt: hackathonSubmissions.submittedAt,
      })
      .from(hackathonSubmissions)
      .where(eq(hackathonSubmissions.teamId, input.teamId)),
  ]);
  return {
    tracks,
    teamName: teams[0]?.name ?? null,
    entry: entries[0] ?? null,
  };
};
