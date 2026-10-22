import {
  AppError,
  err,
  id,
  ok,
  type HackathonJudgeStatus,
  type Result,
} from '@founders-coffee/core';
import {
  acceptHackathonJudgeInvite,
  addHackathonJudgeInvite,
  countOpenJudgePlaces,
  declineHackathonJudgeInvite,
  getHackathon,
  listOrganiserHackathonJudges,
  readHackathonJudgeInvite,
  readHeldJudgePlace,
  removeHackathonJudge,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { hashSecretToken, newSecretToken } from '../secret-tokens.js';
import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';

type Organiser = {
  readonly eventId: string;
  readonly userId: string;
  readonly organisationId: string;
};

type JudgeHackathon = {
  readonly marketCode: string;
  readonly timeline: hackathons.HackathonTimeline;
  readonly isCancelled: boolean;
};

export type JudgeInviteCreated = {
  readonly judgeId: string;
  readonly token: string;
};

export type OrganiserJudgeView = {
  readonly id: string;
  readonly status: HackathonJudgeStatus;
  readonly userId: string | null;
  readonly name: string | null;
  readonly createdAt: number;
  readonly respondedAt: number | null;
};

export type JudgeInviteAnswered = {
  readonly eventId: string;
  readonly status: 'accepted' | 'declined';
};

/** The hackathon a judge rule is about, with its timeline, while hackathons are on in its market. */
const loadJudgeHackathon = async (
  db: Db,
  eventId: string,
): Promise<Result<JudgeHackathon>> => {
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

/** Whether the organisers may add a judge's place now, counting the places already open. */
const decideAdd = async (
  db: Db,
  eventId: string,
  now: number,
): Promise<Result<JudgeHackathon>> => {
  const loaded = await loadJudgeHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  const decided = hackathons.decideJudgeChange({
    ...loaded.data,
    now,
    openPlaces: await countOpenJudgePlaces(db, eventId),
  });
  return decided.ok ? loaded : decided;
};

/**
 * Make an invite link for one judge (B-JDG-03). Each judge gets a link of their own, which works
 * until they answer it or the organisers remove it, and any member who opens it signed in can
 * accept it. The token is answered once, here, and only its hash is kept.
 */
export const createJudgeInviteResolver = async (
  db: Db,
  input: Organiser,
  now: number = Date.now(),
): Promise<Result<JudgeInviteCreated>> => {
  const decided = await decideAdd(db, input.eventId, now);
  if (!decided.ok) return decided;
  const token = newSecretToken();
  const judgeId = id('jdg');
  const added = await addHackathonJudgeInvite(db, {
    id: judgeId,
    eventId: input.eventId,
    tokenHash: await hashSecretToken(token),
    invitedBy: input.userId,
    limit: hackathons.HACKATHON_JUDGE_LIMIT,
  });
  if (!added) {
    const again = await decideAdd(db, input.eventId, now);
    return again.ok
      ? err(
          new AppError(
            'judge_limit_reached',
            'This hackathon has enough judges',
          ),
        )
      : again;
  }
  logger.info('hackathon.judge_invited', {
    eventId: input.eventId,
    marketCode: decided.data.marketCode,
    organisationId: input.organisationId,
  });
  return ok({ judgeId, token });
};

/**
 * Remove a judge's place (B-JDG-03): a link nobody answered stops working, and a judge who
 * accepted stops judging, while judging has not ended.
 */
export const removeJudgeResolver = async (
  db: Db,
  input: Omit<Organiser, 'userId'> & { readonly judgeId: string },
  now: number = Date.now(),
): Promise<Result<{ readonly judgeId: string }>> => {
  const loaded = await loadJudgeHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decided = hackathons.decideJudgeChange({ ...loaded.data, now });
  if (!decided.ok) return decided;
  const removed = await removeHackathonJudge(db, input);
  if (!removed)
    return err(new AppError('judge_not_found', 'No such judge to remove'));
  logger.info('hackathon.judge_removed', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
    organisationId: input.organisationId,
  });
  return ok({ judgeId: input.judgeId });
};

/** Every judge's place for the hackathon's organisers (B-JDG-03), with who accepted each. */
export const listJudgesResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<readonly OrganiserJudgeView[]>> => {
  const loaded = await loadJudgeHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  const judges = await listOrganiserHackathonJudges(db, eventId);
  return ok(
    judges.map((judge) => ({
      ...judge,
      createdAt: judge.createdAt.getTime(),
      respondedAt: judge.respondedAt?.getTime() ?? null,
    })),
  );
};

const inviteInvalid = () =>
  err(new AppError('judge_invite_invalid', 'This invite link no longer works'));

/**
 * Accept or decline a judge's invite link as the signed-in member (B-JDG-03).
 *
 * The rules decide first, from the link and any place the member already holds; the write checks
 * the link is still waiting and, to accept, that the member holds no place, in the same statement,
 * so when something changed in between the rules are asked again to say why. Accepting the link
 * the member already accepted answers as done. A link nobody made answers as one that no longer
 * works.
 */
export const answerJudgeInviteResolver = async (
  db: Db,
  input: hackathons.HackathonJudgeAnswerInput & { readonly userId: string },
  now: number = Date.now(),
): Promise<Result<JudgeInviteAnswered>> => {
  const tokenHash = await hashSecretToken(input.token);
  const decide = async () => {
    const invite = await readHackathonJudgeInvite(db, tokenHash);
    if (!invite) return inviteInvalid();
    const loaded = await loadJudgeHackathon(db, invite.eventId);
    if (!loaded.ok) return loaded;
    const decided = hackathons.decideJudgeAnswer({
      ...loaded.data,
      invite,
      answer: input.answer,
      userId: input.userId,
      heldPlace: await readHeldJudgePlace(db, {
        eventId: invite.eventId,
        userId: input.userId,
      }),
      now,
    });
    return decided.ok
      ? ok({ ...decided.data, invite, marketCode: loaded.data.marketCode })
      : decided;
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const { invite, marketCode, isAlreadyAnswered } = decided.data;
  const status = input.answer === 'accept' ? 'accepted' : 'declined';
  if (isAlreadyAnswered) return ok({ eventId: invite.eventId, status });
  const written =
    input.answer === 'accept'
      ? await acceptHackathonJudgeInvite(db, {
          tokenHash,
          userId: input.userId,
        })
      : await declineHackathonJudgeInvite(db, tokenHash);
  if (!written) {
    const again = await decide();
    if (!again.ok) return again;
    return again.data.isAlreadyAnswered
      ? ok({ eventId: invite.eventId, status })
      : inviteInvalid();
  }
  logger.info(`hackathon.judge_${status}`, {
    eventId: invite.eventId,
    marketCode,
  });
  return ok({ eventId: invite.eventId, status });
};
