import { ok, type Result } from '@founders-coffee/core';
import {
  acceptHackathonJudgeInvite,
  addHackathonJudgeInvite,
  countOpenJudgePlaces,
  declineHackathonJudgeInvite,
  holdsHackathonRegistration,
  listOrganiserHackathonJudges,
  readHackathonJudgeInvite,
  readHeldJudgePlace,
  readHeldMentorPlace,
  removeHackathonJudge,
  type Db,
} from '@founders-coffee/db';
import type { hackathons } from '@founders-coffee/domain';

import { loadPlaceHackathon } from './place-context.js';
import {
  answerPlaceInvite,
  createPlaceInvite,
  placeView,
  removePlaceResolver,
  type Organiser,
  type OrganiserPlaceView,
  type PlaceAnswered,
  type PlacePorts,
} from './places.js';
import { notifyJudgeAccepted } from '../notifications/hackathon-judge-notices.js';
import { cancelJudgeReminders } from '../notifications/hackathon-reminders.js';

export type JudgeInviteCreated = {
  readonly judgeId: string;
  readonly token: string;
};

export type OrganiserJudgeView = OrganiserPlaceView;

export type JudgeInviteAnswered = PlaceAnswered;

const judgePorts: PlacePorts = {
  role: 'judge',
  idPrefix: 'jdg',
  countOpen: countOpenJudgePlaces,
  add: addHackathonJudgeInvite,
  remove: (db, input) =>
    removeHackathonJudge(db, {
      eventId: input.eventId,
      judgeId: input.placeId,
    }),
  readInvite: readHackathonJudgeInvite,
  readHeld: readHeldJudgePlace,
  readHeldOther: readHeldMentorPlace,
  isParticipating: holdsHackathonRegistration,
  decline: declineHackathonJudgeInvite,
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
  const made = await createPlaceInvite(db, judgePorts, input, now);
  return made.ok
    ? ok({ judgeId: made.data.placeId, token: made.data.token })
    : made;
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
  const judges = await listOrganiserHackathonJudges(db, input.eventId);
  const removed = await removePlaceResolver(
    db,
    judgePorts,
    { ...input, placeId: input.judgeId },
    now,
  );
  if (!removed.ok) return removed;
  const userId = judges.find((judge) => judge.id === input.judgeId)?.userId;
  if (userId)
    await cancelJudgeReminders(db, { eventId: input.eventId, userId });
  return ok({ judgeId: removed.data.placeId });
};

/** Every judge's place for the hackathon's organisers (B-JDG-03), with who accepted each. */
export const listJudgesResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<readonly OrganiserJudgeView[]>> => {
  const loaded = await loadPlaceHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  return ok((await listOrganiserHackathonJudges(db, eventId)).map(placeView));
};

/**
 * Accept or decline a judge's invite link as the signed-in member (B-JDG-03). A member who
 * mentors the hackathon, or takes part in it, cannot also judge it (B-HKN-25, B-SAFE-04).
 */
export const answerJudgeInviteResolver = (
  db: Db,
  input: hackathons.HackathonJudgeAnswerInput & { readonly userId: string },
  now: number = Date.now(),
): Promise<Result<JudgeInviteAnswered>> =>
  answerPlaceInvite(
    db,
    judgePorts,
    {
      ...input,
      accept: (tokenHash) =>
        acceptHackathonJudgeInvite(db, { tokenHash, userId: input.userId }),
      onAccepted: (eventId) =>
        notifyJudgeAccepted(db, { eventId, userId: input.userId }),
    },
    now,
  );
