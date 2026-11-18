import {
  AppError,
  err,
  ok,
  type HackathonInterestLaunchDueMessage,
  type Result,
} from '@founders-coffee/core';
import {
  cancelHackathonInterestLaunch,
  claimHackathonInterest,
  completeHackathonInterestLaunchIfDrained,
  getHackathon,
  getHackathonInterestLaunch,
  listDueHackathonInterestLaunches,
  releaseHackathonInterest,
  type ClaimedInterest,
  type Db,
  type HackathonInterestLaunchRow,
} from '@founders-coffee/db';
import type { EmailProvider } from '@founders-coffee/email';
import { describeError, logger } from '@founders-coffee/observability';
import {
  hackathonInterestEmails,
  type InterestHackathon,
} from '@founders-coffee/server-fns/hackathon-interest-launch';

const BATCH_SIZE = 50;
const SWEEP_LAUNCHES = 20;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_SECONDS = 5 * 60;

export interface HackathonInterestLaunchDeps {
  readonly email: EmailProvider;
  readonly requeue?: (
    message: HackathonInterestLaunchDueMessage,
    delaySeconds: number,
  ) => Promise<void>;
}

type RegistrationWindow = 'not_yet' | 'open' | 'withdrawn';

/**
 * Where the round's hackathon stands. The list was promised a registration it can still use, so a
 * hackathon no longer published, or whose registration has already closed, withdraws the round.
 */
const registrationWindow = (
  found: InterestHackathon | null,
  now: Date,
): RegistrationWindow => {
  if (found?.event.status !== 'published') return 'withdrawn';
  if (now < found.hackathon.registrationOpensAt) return 'not_yet';
  return now < found.hackathon.registrationClosesAt ? 'open' : 'withdrawn';
};

/**
 * Send one claimed address its notice, and say whether it went. A failure puts the address back to
 * wait for a later pass, until its third attempt, after which it is given up on.
 */
const deliver = async (
  db: Db,
  interest: ClaimedInterest,
  emails: ReturnType<typeof hackathonInterestEmails>,
  deps: HackathonInterestLaunchDeps,
): Promise<boolean> => {
  const outcome = await emails(interest.locale)
    .then((payload) => deps.email.send({ to: interest.email, ...payload }))
    .then(
      (sent) => (sent.ok ? null : sent.error.message),
      (error: unknown) => describeError(error),
    );
  if (outcome === null) return true;
  await releaseHackathonInterest(db, {
    id: interest.id,
    error: outcome,
    isFinal: interest.sendAttempts >= MAX_ATTEMPTS,
  });
  return false;
};

/**
 * Hand the round back to the queue for its next batch: at once, or after a pause when this one had
 * failures, so a provider outage is not retried in a tight loop. Without a queue, the recovery
 * sweep carries it on.
 */
const continueLater = async (
  launch: HackathonInterestLaunchRow,
  deps: HackathonInterestLaunchDeps,
  failed: number,
): Promise<void> => {
  await deps.requeue?.(
    {
      kind: 'hackathon_interest_launch_due',
      launchId: launch.id,
      eventId: launch.eventId,
    },
    failed > 0 ? RETRY_DELAY_SECONDS : 0,
  );
};

/**
 * Work one round forward once its hackathon has opened registration: send a batch of the market's
 * waiting addresses their notice, then complete the round or schedule its next batch.
 */
const resolveLaunch = async (
  db: Db,
  launch: HackathonInterestLaunchRow,
  deps: HackathonInterestLaunchDeps,
  now: Date,
): Promise<void> => {
  const found = await getHackathon(db, launch.eventId);
  const window = registrationWindow(found, now);
  if (window === 'not_yet') return;
  const context = { launchId: launch.id, marketCode: launch.marketCode };
  if (window === 'withdrawn' || !found) {
    await cancelHackathonInterestLaunch(db, launch.id, now);
    logger.info('hackathon_interest.launch_withdrawn', context);
    return;
  }

  const claimed = await claimHackathonInterest(db, {
    marketCode: launch.marketCode,
    now,
    limit: BATCH_SIZE,
  });
  const emails = hackathonInterestEmails(db, found);
  let failed = 0;
  for (const interest of claimed)
    if (!(await deliver(db, interest, emails, deps))) failed += 1;
  if (claimed.length > 0)
    logger.info('hackathon_interest.batch_sent', {
      ...context,
      sent: claimed.length - failed,
      failed,
    });

  if (await completeHackathonInterestLaunchIfDrained(db, launch, now)) {
    logger.info('hackathon_interest.launch_completed', context);
    return;
  }
  await continueLater(launch, deps, failed);
};

/**
 * Consume one `hackathon_interest_launch_due` message. A round that no longer exists, is closed, or
 * belongs to another hackathon is acknowledged as done; a database failure is returned so the
 * queue retries the message.
 */
export const processHackathonInterestLaunch = async (
  db: Db,
  message: HackathonInterestLaunchDueMessage,
  deps: HackathonInterestLaunchDeps,
): Promise<Result<{ launchId: string }>> => {
  try {
    const launch = await getHackathonInterestLaunch(db, message.launchId);
    if (launch?.status === 'pending' && launch.eventId === message.eventId)
      await resolveLaunch(db, launch, deps, new Date());
    return ok({ launchId: message.launchId });
  } catch (error) {
    logger.error('hackathon_interest.launch_failed', {
      launchId: message.launchId,
      eventId: message.eventId,
      message: describeError(error),
    });
    return err(
      new AppError('hackathon_interest_launch_failed', describeError(error)),
    );
  }
};

/**
 * Start, and recover, the rounds whose hackathon has opened registration, every fifteen minutes.
 * Approval happens in the admin app, which has no queue to schedule the opening with, so this is
 * what notices it; the queue then carries the round's later batches.
 */
export const sweepHackathonInterestLaunches = async (
  db: Db,
  deps: HackathonInterestLaunchDeps,
): Promise<void> => {
  const now = new Date();
  for (const launch of await listDueHackathonInterestLaunches(db, {
    now,
    limit: SWEEP_LAUNCHES,
  })) {
    try {
      await resolveLaunch(db, launch, deps, now);
    } catch (error) {
      logger.error('hackathon_interest.launch_failed', {
        launchId: launch.id,
        eventId: launch.eventId,
        message: describeError(error),
      });
    }
  }
};
