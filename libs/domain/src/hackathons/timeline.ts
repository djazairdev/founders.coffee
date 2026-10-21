import { z } from 'zod';

import type { HackathonPhase } from '@founders-coffee/core';

const instant = z.number().int().positive();

/**
 * Check that a hackathon's dates come in the one order every phase depends on.
 *
 * Registration opens before it closes, and closes no later than kickoff; the build runs from kickoff
 * to the submission deadline, which is no later than the event's end; judging ends after both.
 * Kickoff is the event's start, so the event's own schedule rules still apply to it and to `endsAt`.
 */
const checkOrder = (
  timeline: HackathonTimeline,
  context: z.RefinementCtx,
): void => {
  const issue = (path: keyof HackathonTimeline, message: string) =>
    context.addIssue({ code: 'custom', path: [path], message });
  if (timeline.registrationOpensAt >= timeline.registrationClosesAt)
    issue('registrationClosesAt', 'Registration must close after it opens');
  if (timeline.registrationClosesAt > timeline.kickoffAt)
    issue('kickoffAt', 'Kickoff cannot come before registration closes');
  if (timeline.kickoffAt >= timeline.submissionDeadlineAt)
    issue('submissionDeadlineAt', 'Submissions must close after kickoff');
  if (timeline.submissionDeadlineAt > timeline.endsAt)
    issue('endsAt', 'The event cannot end before submissions close');
  if (timeline.endsAt >= timeline.judgingEndsAt)
    issue('judgingEndsAt', 'Judging must end after the event');
};

const timelineShape = z.strictObject({
  registrationOpensAt: instant,
  registrationClosesAt: instant,
  kickoffAt: instant,
  submissionDeadlineAt: instant,
  endsAt: instant,
  judgingEndsAt: instant,
});

export type HackathonTimeline = z.infer<typeof timelineShape>;

export const hackathonTimelineSchema = timelineShape.superRefine(checkOrder);

/**
 * Where a hackathon is at `now`, from its dates alone.
 *
 * No phase is stored: every server function compares UTC timestamps, so a phase never needs a job
 * to move it on and can never disagree with the dates. Each boundary belongs to the phase it opens:
 * at `registrationOpensAt` registration is open, at `submissionDeadlineAt` judging has begun and
 * nothing more can be submitted. `endsAt` (demo day) is not a boundary, since judging runs across it.
 */
export const phaseAt = (
  timeline: HackathonTimeline,
  now: number,
): HackathonPhase => {
  if (now < timeline.registrationOpensAt) return 'upcoming';
  if (now < timeline.registrationClosesAt) return 'registration_open';
  if (now < timeline.kickoffAt) return 'registration_closed';
  if (now < timeline.submissionDeadlineAt) return 'building';
  if (now < timeline.judgingEndsAt) return 'judging';
  return 'results';
};
