import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  decideHackathonReview,
  getHackathon,
  listHackathonsForReview,
  type Db,
  type HackathonForReview,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { recordHackathonMetric } from '../hackathons/metrics.js';
import { scheduleOrganiserReminders } from '../notifications/hackathon-reminders.js';
import type { HackathonDecisionNotice } from './hackathon-decision-email.js';

export type HackathonReviewItem = {
  readonly eventId: string;
  readonly title: string;
  readonly description: string;
  readonly marketCode: string;
  readonly cityCode: string;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly timeZone: string;
  readonly organisation: { readonly name: string; readonly slug: string };
  readonly submittedAt: Date;
  readonly registrationOpensAt: Date;
  readonly registrationClosesAt: Date;
  readonly submissionDeadlineAt: Date;
  readonly judgingEndsAt: Date;
  readonly capacity: number | null;
  readonly minimumAge: number | null;
  readonly teamMin: number;
  readonly teamMax: number;
  readonly rules: string | null;
  readonly trackTitles: readonly string[];
};

export type HackathonReviewQueue = {
  readonly items: readonly HackathonReviewItem[];
  readonly hasMore: boolean;
};

export type HackathonDecided = {
  readonly eventId: string;
  readonly decision: hackathons.HackathonReviewDecision;
};

const itemOf = (row: HackathonForReview): HackathonReviewItem => ({
  eventId: row.event.id,
  title: row.event.title,
  description: row.event.description,
  marketCode: row.event.marketCode,
  cityCode: row.event.cityCode,
  startsAt: row.event.startsAt,
  endsAt: row.event.endsAt,
  timeZone: row.timeZone,
  organisation: row.organisation,
  submittedAt: row.details.updatedAt,
  registrationOpensAt: row.details.registrationOpensAt,
  registrationClosesAt: row.details.registrationClosesAt,
  submissionDeadlineAt: row.details.submissionDeadlineAt,
  judgingEndsAt: row.details.judgingEndsAt,
  capacity: row.details.capacity,
  minimumAge: row.details.minimumAge,
  teamMin: row.details.teamMin,
  teamMax: row.details.teamMax,
  rules: row.details.rules,
  trackTitles: row.trackTitles,
});

/** One page of the hackathons waiting for review, for the operator's queue (B-HKN-08). */
export const listHackathonReviewQueueResolver = async (
  db: Db,
  page: number,
): Promise<Result<HackathonReviewQueue>> => {
  const queue = await listHackathonsForReview(db, page);
  return ok({ items: queue.items.map(itemOf), hasMore: queue.hasMore });
};

/**
 * Approve or reject a hackathon its organisers sent for review (B-HKN-08).
 *
 * The rule decides from the review status read now; the write moves it only from that status while
 * the event is still an unpublished draft, with the audit entry in the same batch, so two operators
 * deciding at once cannot both win (`invalid_hackathon_transition`). Approving publishes the event
 * and counts it; rejecting leaves it a draft with the note, for the organisers to change and send
 * again. Either way the organisers are emailed, best effort, once the decision is written, and an
 * approval schedules their reminders (B-HKN-21).
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
  if (!found) return err(new AppError('not_found', 'Hackathon not found'));
  const rule = hackathons.decideHackathonReview(
    found.hackathon.reviewStatus,
    decision,
  );
  if (!rule.ok) return rule;
  const note = input.decision.note ?? null;
  const isDecided = await decideHackathonReview(db, {
    eventId,
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
