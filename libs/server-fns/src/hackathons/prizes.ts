import { AppError, err, id, type Result } from '@founders-coffee/core';
import {
  addHackathonPrize,
  hackathonAtVersion,
  hackathonPrizeChange,
  hackathonPrizeConfirmation,
  hackathonPrizeRemoval,
  listHackathonTracks,
  listOrganiserHackathonPrizes,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  hackathonDetailsRequired,
  hackathonNotEditable,
  loadHackathonEdit,
  runHackathonEdit,
  type HackathonEditTarget,
} from './edit-context.js';

type EditInput = {
  readonly eventId: string;
  readonly version: number;
  readonly organisationId: string;
};

type Saved = Result<{ readonly eventId: string; readonly version: number }>;

const prizeNotFound = () =>
  err(new AppError('hackathon_prize_not_found', 'No such prize'));

/** Load the hackathon for a prize edit: it has its details, and a prize can be added at its stage. */
const loadPrizeEdit = async (
  db: Db,
  input: EditInput,
  now: number,
): Promise<Result<HackathonEditTarget>> => {
  const loaded = await loadHackathonEdit(db, input, now);
  if (!loaded.ok) return loaded;
  if (!loaded.data.details) return hackathonDetailsRequired();
  if (!hackathons.isPrizeAddable(loaded.data.stage))
    return hackathonNotEditable();
  return loaded;
};

/** Refuse a prize for a track this hackathon does not have; an overall prize names none. */
const checkPrizeTrack = async (
  db: Db,
  eventId: string,
  prize: hackathons.HackathonPrizeInput,
): Promise<AppError | null> => {
  if (prize.trackId === null) return null;
  const tracks = await listHackathonTracks(db, eventId);
  return tracks.some((track) => track.id === prize.trackId)
    ? null
    : new AppError('track_not_in_hackathon', 'No such track in this hackathon');
};

/**
 * Add a prize to a hackathon, unconfirmed (B-HKN-14, B-HKN-07). Prizes can be added until the
 * hackathon is over, so a sponsor who joins after registration opens still can; the public sees a
 * prize only once its provider confirms it. Answers the new version.
 */
export const addHackathonPrizeResolver = async (
  db: Db,
  input: EditInput & { readonly prize: hackathons.HackathonPrizeInput },
  now: number = Date.now(),
): Promise<Saved> => {
  const loaded = await loadPrizeEdit(db, input, now);
  if (!loaded.ok) return loaded;
  const trackRefused = await checkPrizeTrack(db, input.eventId, input.prize);
  if (trackRefused) return err(trackRefused);
  return runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_prize_added',
    organisationId: input.organisationId,
    writes: [
      addHackathonPrize(
        db,
        { id: id('prz'), eventId: input.eventId, prize: input.prize },
        hackathonAtVersion(input.eventId, input.version),
      ),
    ],
    isSingleRow: true,
  });
};

type PrizeRule = (
  stage: hackathons.HackathonEditStage,
  isConfirmed: boolean,
) => boolean;

/**
 * Find a prize an organiser wants to act on, and refuse when the hackathon's stage or the prize's
 * confirmation no longer allows it under `isAllowed` (B-HKN-07, B-HKN-10).
 */
const loadPrizeFor = async (
  db: Db,
  input: EditInput & { readonly prizeId: string },
  now: number,
  isAllowed: PrizeRule,
): Promise<Result<HackathonEditTarget>> => {
  const loaded = await loadPrizeEdit(db, input, now);
  if (!loaded.ok) return loaded;
  const prizes = await listOrganiserHackathonPrizes(db, input.eventId);
  const prize = prizes.find((saved) => saved.id === input.prizeId);
  if (!prize) return prizeNotFound();
  if (!isAllowed(loaded.data.stage, prize.confirmedAt !== null))
    return err(
      new AppError(
        'hackathon_field_locked',
        'This prize can no longer be changed',
        { fields: ['prizes'] },
      ),
    );
  return loaded;
};

/**
 * Reword a prize (B-HKN-07): only before registration opens. A confirmed prize may be reworded
 * too, but a new title, value or provider takes its confirmation away (B-HKN-10). Answers the new
 * version.
 */
export const changeHackathonPrizeResolver = async (
  db: Db,
  input: EditInput & {
    readonly prizeId: string;
    readonly prize: hackathons.HackathonPrizeInput;
  },
  now: number = Date.now(),
): Promise<Saved> => {
  const loaded = await loadPrizeFor(
    db,
    input,
    now,
    hackathons.isPrizeChangeable,
  );
  if (!loaded.ok) return loaded;
  const trackRefused = await checkPrizeTrack(db, input.eventId, input.prize);
  if (trackRefused) return err(trackRefused);
  return runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_prize_changed',
    organisationId: input.organisationId,
    writes: [hackathonPrizeChange(db, input)],
    isSingleRow: true,
  });
};

/**
 * Withdraw a prize (B-HKN-07): only before registration opens, and only while its provider has not
 * confirmed it. Answers the new version.
 */
export const removeHackathonPrizeResolver = async (
  db: Db,
  input: EditInput & { readonly prizeId: string },
  now: number = Date.now(),
): Promise<Saved> => {
  const loaded = await loadPrizeFor(
    db,
    input,
    now,
    hackathons.isPrizeRemovable,
  );
  if (!loaded.ok) return loaded;
  return runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_prize_removed',
    organisationId: input.organisationId,
    writes: [hackathonPrizeRemoval(db, input)],
    isSingleRow: true,
  });
};

/**
 * Mark a prize confirmed by its provider (B-HKN-10), with the organisers' private note of who
 * confirmed it, when and how; from then the public sees it. Allowed until the hackathon is over, so
 * a late sponsor's prize can be confirmed too. Answers the new version.
 */
export const confirmHackathonPrizeResolver = async (
  db: Db,
  input: EditInput & { readonly prizeId: string; readonly note: string },
  now: number = Date.now(),
): Promise<Saved> => {
  const loaded = await loadPrizeFor(
    db,
    input,
    now,
    hackathons.isPrizeConfirmable,
  );
  if (!loaded.ok) return loaded;
  return runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_prize_confirmed',
    organisationId: input.organisationId,
    writes: [
      hackathonPrizeConfirmation(db, { ...input, confirmedAt: new Date(now) }),
    ],
    isSingleRow: true,
  });
};
