import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  getHackathon,
  getUser,
  readParticipantStanding,
  withdrawHackathonRegistration,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { enqueueHackathonRegistrationNotice } from '../notifications/hackathon-registration.js';
import {
  cancelParticipantReminders,
  scheduleParticipantReminders,
} from '../notifications/hackathon-reminders.js';
import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';
import { recordHackathonMetric } from './metrics.js';

export type Withdrawn = { readonly isWithdrawn: true };

/**
 * Withdraw the signed-in member from a hackathon (B-REG-04).
 *
 * The rule decides first, from where the member stands: they hold a place or wait for one, the
 * submission deadline is still ahead, and a captain with teammates has handed the team on
 * (`not_registered`, `withdrawal_closed`, `captain_must_transfer`). The write then re-checks all of
 * it in one atomic batch that also takes them out of their team and, when they held a place, gives
 * it to the earliest member on the waitlist. When something changed in between, the rule is asked
 * again against where they now stand, so the refusal says why. The member given the place is told
 * it is theirs (B-REG-07).
 */
export const withdrawFromHackathonResolver = async (
  db: Db,
  metrics: Metrics | null,
  input: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<Withdrawn>> => {
  const found = await getHackathon(db, input.eventId);
  if (!found || found.event.status !== 'published') return hackathonNotFound();
  const { event, hackathon } = found;
  const disabled = await requireHackathonsEnabled(db, event.marketCode);
  if (disabled) return err(disabled);
  const timeline = {
    registrationOpensAt: hackathon.registrationOpensAt.getTime(),
    registrationClosesAt: hackathon.registrationClosesAt.getTime(),
    kickoffAt: event.startsAt.getTime(),
    submissionDeadlineAt: hackathon.submissionDeadlineAt.getTime(),
    endsAt: (event.endsAt ?? event.startsAt).getTime(),
    judgingEndsAt: hackathon.judgingEndsAt.getTime(),
  };
  const decide = async () =>
    hackathons.decideWithdrawal({
      timeline,
      now,
      ...(await readParticipantStanding(db, input)),
    });
  const decided = await decide();
  if (!decided.ok) return decided;
  const written = await withdrawHackathonRegistration(db, input);
  if (written.outcome === 'not_withdrawn') {
    const again = await decide();
    return again.ok
      ? err(new AppError('withdrawal_closed', 'Withdrawing has closed'))
      : again;
  }
  recordHackathonMetric(metrics, 'registration_withdrawn', {
    marketCode: event.marketCode,
    hackathonId: event.id,
  });
  logger.info('hackathon.withdrawn', {
    eventId: event.id,
    marketCode: event.marketCode,
    isPlaceGivenOn: written.promotedUserId !== null,
  });
  await cancelParticipantReminders(db, {
    eventId: event.id,
    userId: input.userId,
  });
  if (written.promotedUserId) {
    const locale = (await getUser(db, written.promotedUserId))?.localePref;
    await enqueueHackathonRegistrationNotice(db, {
      templateKey: 'hackathon_promoted',
      eventId: event.id,
      userId: written.promotedUserId,
      eventTitle: event.title,
      eventSlug: event.slug,
      marketCode: event.marketCode,
      startsAt: event.startsAt,
      venue: event.venue,
      locale,
    });
    await scheduleParticipantReminders(db, {
      eventId: event.id,
      userId: written.promotedUserId,
      locale,
    });
  }
  return ok({ isWithdrawn: true });
};
