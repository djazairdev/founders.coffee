import { err, ok, type Result } from '@founders-coffee/core';
import { getHackathon, type Db } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';

export type PlaceHackathon = {
  readonly marketCode: string;
  readonly timeline: hackathons.HackathonTimeline;
  readonly isCancelled: boolean;
};

/**
 * The hackathon a judge's or a mentor's place is in (B-JDG-03, B-HKN-25), with its timeline and
 * whether it was cancelled, while hackathons are on in its market. A draft counts, so organisers
 * can line people up before publishing.
 */
export const loadPlaceHackathon = async (
  db: Db,
  eventId: string,
): Promise<Result<PlaceHackathon>> => {
  const found = await getHackathon(db, eventId);
  if (!found) return hackathonNotFound();
  const { event, hackathon } = found;
  const disabled = await requireHackathonsEnabled(db, event.marketCode);
  if (disabled) return err(disabled);
  return ok({
    marketCode: event.marketCode,
    isCancelled: event.status === 'cancelled',
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
