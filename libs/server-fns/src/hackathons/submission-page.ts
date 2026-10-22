import {
  ok,
  type HackathonAiPolicy,
  type HackathonRegistrationStatus,
  type HackathonSubmissionStatus,
  type HackathonTrackKind,
  type Result,
} from '@founders-coffee/core';
import {
  readParticipantStanding,
  readSubmissionPageRows,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { loadTeamHackathon } from './team-context.js';

export type SubmissionStage = 'not_started' | 'building' | 'closed';

export type SubmissionPageView = {
  readonly event: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly marketCode: string;
  };
  readonly kickoffAt: number;
  readonly submissionDeadlineAt: number;
  readonly stage: SubmissionStage;
  readonly aiPolicy: HackathonAiPolicy;
  readonly registration: HackathonRegistrationStatus | null;
  readonly team: {
    readonly id: string;
    readonly name: string;
    readonly isCaptain: boolean;
  } | null;
  readonly tracks: readonly {
    readonly id: string;
    readonly title: string;
    readonly kind: HackathonTrackKind;
  }[];
  readonly entry: {
    readonly id: string;
    readonly status: HackathonSubmissionStatus;
    readonly version: number;
    readonly trackId: string | null;
    readonly title: string;
    readonly description: string;
    readonly repositoryUrl: string | null;
    readonly demoVideoUrl: string | null;
    readonly pullRequestUrls: readonly string[];
    readonly aiTools: readonly string[];
    readonly aiStatement: string | null;
    readonly submittedAt: number | null;
  } | null;
};

const stageAt = (
  timeline: hackathons.HackathonTimeline,
  now: number,
): SubmissionStage => {
  const phase = hackathons.phaseAt(timeline, now);
  if (phase === 'building') return 'building';
  return phase === 'judging' || phase === 'results' ? 'closed' : 'not_started';
};

/**
 * A member's submission page for a published hackathon (B-SUB-05): where they stand, whether the
 * team can still change its entry, decided here from the hackathon's dates, and, for a member of a
 * team, the hackathon's tracks and the team's entry as it stands. Only a team's own members are
 * given its entry; whether they may save it is the captain's, which the page is told.
 */
export const submissionPageResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<SubmissionPageView>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { event, timeline, aiPolicy } = loaded.data;
  const { status, membership } = await readParticipantStanding(db, input);
  const rows = membership
    ? await readSubmissionPageRows(db, {
        eventId: input.eventId,
        teamId: membership.teamId,
      })
    : null;
  const entry = rows?.entry ?? null;
  return ok({
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      marketCode: event.marketCode,
    },
    kickoffAt: timeline.kickoffAt,
    submissionDeadlineAt: timeline.submissionDeadlineAt,
    stage: stageAt(timeline, now),
    aiPolicy,
    registration: status,
    team:
      membership && rows?.teamName
        ? {
            id: membership.teamId,
            name: rows.teamName,
            isCaptain: membership.isCaptain,
          }
        : null,
    tracks: rows?.tracks ?? [],
    entry: entry && {
      ...entry,
      submittedAt: entry.submittedAt?.getTime() ?? null,
    },
  });
};
