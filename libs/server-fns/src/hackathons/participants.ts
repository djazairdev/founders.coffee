import { err, ok, type Result } from '@founders-coffee/core';
import {
  getHackathon,
  listHackathonParticipants,
  listHackathonTeams,
  type Db,
  type HackathonParticipant,
  type HackathonTeamListing,
} from '@founders-coffee/db';

import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';

export type HackathonParticipantsView = {
  readonly participants: readonly HackathonParticipant[];
  readonly isTruncated: boolean;
};

/**
 * Who registered for a hackathon, for its organisers (B-REG-08). The middleware has checked that the
 * reader may manage it.
 */
export const hackathonParticipantsResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<HackathonParticipantsView>> => {
  const found = await getHackathon(db, eventId);
  if (!found) return hackathonNotFound();
  const disabled = await requireHackathonsEnabled(db, found.event.marketCode);
  if (disabled) return err(disabled);
  return ok(await listHackathonParticipants(db, eventId));
};

export type HackathonTeamsView = {
  readonly teams: readonly HackathonTeamListing[];
  readonly isTruncated: boolean;
};

/**
 * A hackathon's teams and how their entries stand, for its organisers (B-OPS-02). The middleware has
 * checked that the reader may manage it.
 */
export const hackathonTeamsResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<HackathonTeamsView>> => {
  const found = await getHackathon(db, eventId);
  if (!found) return hackathonNotFound();
  const disabled = await requireHackathonsEnabled(db, found.event.marketCode);
  if (disabled) return err(disabled);
  return ok(await listHackathonTeams(db, eventId));
};
