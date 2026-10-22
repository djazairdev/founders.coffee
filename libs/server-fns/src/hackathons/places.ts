import {
  err,
  id,
  ok,
  type HackathonJudgeStatus,
  type Result,
} from '@founders-coffee/core';
import type { Db, OrganiserPlace, PlaceInviteRead } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { hashSecretToken, newSecretToken } from '../secret-tokens.js';
import { loadPlaceHackathon, type PlaceHackathon } from './place-context.js';

type Held = { readonly eventId: string; readonly userId: string };

export type PlacePorts = {
  readonly role: hackathons.PlaceRole;
  readonly idPrefix: string;
  readonly countOpen: (db: Db, eventId: string) => Promise<number>;
  readonly add: (
    db: Db,
    input: {
      readonly id: string;
      readonly eventId: string;
      readonly tokenHash: string;
      readonly invitedBy: string;
      readonly limit: number;
    },
  ) => Promise<boolean>;
  readonly remove: (
    db: Db,
    input: { readonly eventId: string; readonly placeId: string },
  ) => Promise<boolean>;
  readonly readInvite: (
    db: Db,
    tokenHash: string,
  ) => Promise<PlaceInviteRead | null>;
  readonly readHeld: (
    db: Db,
    held: Held,
  ) => Promise<HackathonJudgeStatus | null>;
  readonly readHeldOther: (
    db: Db,
    held: Held,
  ) => Promise<HackathonJudgeStatus | null>;
  readonly decline: (db: Db, tokenHash: string) => Promise<boolean>;
};

export type Organiser = {
  readonly eventId: string;
  readonly userId: string;
  readonly organisationId: string;
};

export type OrganiserPlaceView = Omit<
  OrganiserPlace,
  'createdAt' | 'respondedAt'
> & {
  readonly createdAt: number;
  readonly respondedAt: number | null;
};

export type PlaceAnswered = {
  readonly eventId: string;
  readonly status: 'accepted' | 'declined';
};

/** A place's dates as the milliseconds a page reads. */
export const placeView = <Place extends OrganiserPlace>(place: Place) => ({
  ...place,
  createdAt: place.createdAt.getTime(),
  respondedAt: place.respondedAt?.getTime() ?? null,
});

/** Whether the organisers may add a place now, counting the role's places already open. */
const decideAdd = async (
  db: Db,
  ports: PlacePorts,
  eventId: string,
  now: number,
): Promise<Result<PlaceHackathon>> => {
  const loaded = await loadPlaceHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  const decided = hackathons.decidePlaceChange(ports.role, {
    ...loaded.data,
    now,
    openPlaces: await ports.countOpen(db, eventId),
  });
  return decided.ok ? loaded : decided;
};

/**
 * Make an invite link for one judge or mentor (B-JDG-03, B-HKN-25). Each gets a link of their own,
 * which works until it is answered or removed. The token is answered once, here, and only its
 * hash is kept. When the write finds the role full after all, the rules are asked again to say so.
 */
export const createPlaceInvite = async (
  db: Db,
  ports: PlacePorts,
  input: Organiser,
  now: number,
): Promise<Result<{ readonly placeId: string; readonly token: string }>> => {
  const decided = await decideAdd(db, ports, input.eventId, now);
  if (!decided.ok) return decided;
  const token = newSecretToken();
  const placeId = id(ports.idPrefix);
  const added = await ports.add(db, {
    id: placeId,
    eventId: input.eventId,
    tokenHash: await hashSecretToken(token),
    invitedBy: input.userId,
    limit: hackathons.HACKATHON_PLACE_LIMIT,
  });
  if (!added) {
    const again = await decideAdd(db, ports, input.eventId, now);
    return again.ok ? err(hackathons.placeRefusal(ports.role, 'limit')) : again;
  }
  logger.info(`hackathon.${ports.role}_invited`, {
    eventId: input.eventId,
    marketCode: decided.data.marketCode,
    organisationId: input.organisationId,
  });
  return ok({ placeId, token });
};

/**
 * Remove a judge's or mentor's place (B-JDG-03, B-HKN-25): a link nobody answered stops working,
 * and a member who accepted no longer holds it, while places can still change.
 */
export const removePlaceResolver = async (
  db: Db,
  ports: PlacePorts,
  input: Omit<Organiser, 'userId'> & { readonly placeId: string },
  now: number,
): Promise<Result<{ readonly placeId: string }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decided = hackathons.decidePlaceChange(ports.role, {
    ...loaded.data,
    now,
  });
  if (!decided.ok) return decided;
  if (!(await ports.remove(db, input)))
    return err(hackathons.placeRefusal(ports.role, 'missing'));
  logger.info(`hackathon.${ports.role}_removed`, {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
    organisationId: input.organisationId,
  });
  return ok({ placeId: input.placeId });
};

/**
 * Accept or decline an invite link as the signed-in member (B-JDG-03, B-HKN-25).
 *
 * The rules decide first, from the link, any place of the role the member already holds and
 * whether they hold the other role in the hackathon; the write checks the same in one statement,
 * so when something changed in between the rules are asked again to say why. Accepting the link
 * the member already accepted answers as done. A link nobody made answers as one that no longer
 * works.
 */
export const answerPlaceInvite = async (
  db: Db,
  ports: PlacePorts,
  input: {
    readonly token: string;
    readonly answer: 'accept' | 'decline';
    readonly userId: string;
    readonly accept: (tokenHash: string) => Promise<boolean>;
  },
  now: number,
): Promise<Result<PlaceAnswered>> => {
  const tokenHash = await hashSecretToken(input.token);
  const invalid = () => err(hackathons.placeRefusal(ports.role, 'invalid'));
  const decide = async () => {
    const invite = await ports.readInvite(db, tokenHash);
    if (!invite) return invalid();
    const loaded = await loadPlaceHackathon(db, invite.eventId);
    if (!loaded.ok) return loaded;
    const held = { eventId: invite.eventId, userId: input.userId };
    const decided = hackathons.decidePlaceAnswer(ports.role, {
      ...loaded.data,
      invite,
      answer: input.answer,
      userId: input.userId,
      heldPlace: await ports.readHeld(db, held),
      holdsOtherRole: (await ports.readHeldOther(db, held)) === 'accepted',
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
  const answered = ok({ eventId: invite.eventId, status } as const);
  if (isAlreadyAnswered) return answered;
  const written =
    input.answer === 'accept'
      ? await input.accept(tokenHash)
      : await ports.decline(db, tokenHash);
  if (!written) {
    const again = await decide();
    if (!again.ok) return again;
    return again.data.isAlreadyAnswered ? answered : invalid();
  }
  logger.info(`hackathon.${ports.role}_${status}`, {
    eventId: invite.eventId,
    marketCode,
  });
  return answered;
};
