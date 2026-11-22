import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  decideHackathonReview,
  getEvent,
  getHackathon,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { openInterestLaunchFor } from '../hackathons/interest-launch.js';
import { recordHackathonMetric } from '../hackathons/metrics.js';
import { scheduleOrganiserReminders } from '../notifications/hackathon-reminders.js';
import type { HackathonDecisionNotice } from './hackathon-decision-email.js';

export type HackathonDecided = {
  readonly eventId: string;
  readonly decision: hackathons.HackathonReviewDecision;
};

/**
 * Approve or reject a saved hackathon draft (B-HKN-08).
 *
 * The rule decides from the review status read now; the write moves it only from that status while
 * the event is still an unpublished draft, with the audit entry in the same batch, so two operators
 * deciding at once cannot both win (`invalid_hackathon_transition`). Approving publishes the event
 * and counts it; rejecting leaves it a draft with the note, for the organisers to change before it
 * returns to the queue automatically. Either way the organisers are emailed, best effort, once the
 * decision is written, and an approval schedules their reminders (B-HKN-21) and owes the market's interest list its
 * registration notice (B-ANN-05).
 */
export const decideHackathonReviewResolver = async (
  db: Db,
  notify: HackathonDecisionNotice,
  metrics: Metrics | null,
  input: {
    readonly decision: hackathons.HackathonReviewDecisionInput;
    readonly actorUserId: string;
    readonly accessSubject: string | null;
  },
): Promise<Result<HackathonDecided>> => {
  const { eventId, decision } = input.decision;
  const found = await getHackathon(db, eventId);
  if (!found) {
    const event = await getEvent(db, eventId);
    if (
      decision === 'approve' &&
      event?.kind === 'hackathon' &&
      event.status === 'draft'
    )
      return err(
        new AppError(
          'hackathon_details_required',
          'Complete the required hackathon details before publishing',
        ),
      );
    return err(new AppError('not_found', 'Hackathon not found'));
  }
  if (decision === 'approve') {
    const { event, hackathon } = found;
    const frame = event.endsAt
      ? {
          startsAt: event.startsAt.getTime(),
          endsAt: event.endsAt.getTime(),
          format: event.format,
        }
      : null;
    const valid = frame
      ? hackathons.hackathonDetailsFor(frame).safeParse({
          registrationOpensAt: hackathon.registrationOpensAt.getTime(),
          registrationClosesAt: hackathon.registrationClosesAt.getTime(),
          submissionDeadlineAt: hackathon.submissionDeadlineAt.getTime(),
          judgingEndsAt: hackathon.judgingEndsAt.getTime(),
          attendanceModes: hackathon.attendanceModes,
          teamMin: hackathon.teamMin,
          teamMax: hackathon.teamMax,
          capacity: hackathon.capacity ?? undefined,
          minimumAge: hackathon.minimumAge ?? undefined,
          rules: hackathon.rules ?? undefined,
          aiPolicy: hackathon.aiPolicy,
          aiPolicyNote: hackathon.aiPolicyNote ?? undefined,
          licenceNote: hackathon.licenceNote ?? undefined,
        })
      : null;
    if (
      !frame ||
      !event.title.trim() ||
      !event.description.trim() ||
      !valid?.success
    )
      return err(
        new AppError(
          'hackathon_details_required',
          'Complete the required hackathon details before publishing',
        ),
      );
  }
  const rule = hackathons.decideHackathonReview(
    found.hackathon.reviewStatus,
    decision,
  );
  if (!rule.ok) return rule;
  const note = input.decision.note ?? null;
  const isDecided = await decideHackathonReview(db, {
    eventId,
    version: input.decision.version,
    from: rule.data.from,
    to: rule.data.to,
    note,
    action: rule.data.action,
    actorUserId: input.actorUserId,
    accessSubject: input.accessSubject,
    auditId: id('aud'),
  });
  if (!isDecided)
    return err(
      new AppError(
        'invalid_hackathon_transition',
        'The hackathon changed since it was read',
      ),
    );
  const { event } = found;
  if (decision === 'approve') {
    recordHackathonMetric(metrics, 'hackathon_published', {
      marketCode: event.marketCode,
      hackathonId: event.id,
    });
    await scheduleOrganiserReminders(db, event.id);
    await openInterestLaunchFor(db, event);
  }
  logger.info('hackathon.reviewed', {
    eventId: event.id,
    marketCode: event.marketCode,
    decision,
  });
  await notify(db, {
    eventId: event.id,
    title: event.title,
    marketCode: event.marketCode,
    decision,
    note,
  });
  return ok({ eventId: event.id, decision });
};
