import { err, ok, type Result } from '@founders-coffee/core';
import {
  readHackathonJudgeInvite,
  readHackathonMentorInvite,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { hashSecretToken } from '../secret-tokens.js';
import { loadPlaceHackathon } from './place-context.js';

export type PlaceInviteView = {
  readonly eventId: string;
  readonly title: string;
  readonly marketCode: string;
  readonly slug: string;
  readonly isDraft: boolean;
  readonly isAccepted: boolean;
};

export const placeInviteResolver = async (
  db: Db,
  input: {
    readonly role: hackathons.PlaceRole;
    readonly token: string;
    readonly userId: string;
  },
  now = Date.now(),
): Promise<Result<PlaceInviteView>> => {
  const read =
    input.role === 'judge'
      ? readHackathonJudgeInvite
      : readHackathonMentorInvite;
  const invite = await read(db, await hashSecretToken(input.token));
  const isAccepted =
    invite?.status === 'accepted' && invite.userId === input.userId;
  if (!invite || (invite.status !== 'invited' && !isAccepted))
    return err(hackathons.placeRefusal(input.role, 'invalid'));
  const loaded = await loadPlaceHackathon(db, invite.eventId);
  if (!loaded.ok) return loaded;
  const { title, marketCode, slug, isDraft } = loaded.data;
  if (!isAccepted) {
    const decision = hackathons.canChangePlaces({ ...loaded.data, now });
    if (!decision.ok) return decision;
  }
  return ok({
    eventId: invite.eventId,
    title,
    marketCode,
    slug,
    isDraft,
    isAccepted,
  });
};
