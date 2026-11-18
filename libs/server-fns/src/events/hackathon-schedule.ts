import type { HackathonPhase } from '@founders-coffee/core';
import type { Event } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

export type HackathonSchedule = hackathons.HackathonTimeline & {
  readonly phase: HackathonPhase;
};

type ScheduleRow = {
  readonly registrationOpensAt: Date;
  readonly registrationClosesAt: Date;
  readonly submissionDeadlineAt: Date;
  readonly judgingEndsAt: Date;
};

/**
 * A hackathon's schedule as its page shows it (B-HKN-17): every date of its timeline, kickoff and
 * demo day from the event itself, and the phase it is in at `now`, decided here so the page renders
 * the same phase on the server and in the browser. `null` for any other kind of event.
 */
export const hackathonScheduleOf = (
  event: Pick<Event, 'kind' | 'startsAt' | 'endsAt'>,
  row: ScheduleRow | null,
  now: number,
): HackathonSchedule | null => {
  if (event.kind !== 'hackathon' || row === null) return null;
  const timeline: hackathons.HackathonTimeline = {
    registrationOpensAt: row.registrationOpensAt.getTime(),
    registrationClosesAt: row.registrationClosesAt.getTime(),
    kickoffAt: event.startsAt.getTime(),
    submissionDeadlineAt: row.submissionDeadlineAt.getTime(),
    endsAt: (event.endsAt ?? event.startsAt).getTime(),
    judgingEndsAt: row.judgingEndsAt.getTime(),
  };
  return { ...timeline, phase: hackathons.phaseAt(timeline, now) };
};
