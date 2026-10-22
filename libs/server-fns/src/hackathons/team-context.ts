import {
  err,
  ok,
  type HackathonAiPolicy,
  type Result,
} from '@founders-coffee/core';
import { getHackathon, type Db, type Event } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';

export type TeamHackathon = {
  readonly event: Event;
  readonly teamMin: number;
  readonly teamMax: number;
  readonly aiPolicy: HackathonAiPolicy;
  readonly timeline: hackathons.HackathonTimeline;
};

/**
 * The published hackathon a team rule is about, with its timeline, while hackathons are on in its
 * market (B-TEAM-03, B-TEAM-04); a draft or cancelled one is not found.
 */
export const loadTeamHackathon = async (
  db: Db,
  eventId: string,
): Promise<Result<TeamHackathon>> => {
  const found = await getHackathon(db, eventId);
  if (!found || found.event.status !== 'published') return hackathonNotFound();
  const { event, hackathon } = found;
  const disabled = await requireHackathonsEnabled(db, event.marketCode);
  if (disabled) return err(disabled);
  return ok({
    event,
    teamMin: hackathon.teamMin,
    teamMax: hackathon.teamMax,
    aiPolicy: hackathon.aiPolicy,
    timeline: {
      registrationOpensAt: hackathon.registrationOpensAt.getTime(),
      registrationClosesAt: hackathon.registrationClosesAt.getTime(),
      kickoffAt: event.startsAt.getTime(),
      submissionDeadlineAt: hackathon.submissionDeadlineAt.getTime(),
      endsAt: (event.endsAt ?? event.startsAt).getTime(),
      judgingEndsAt: hackathon.judgingEndsAt.getTime(),
    },
  });
};
