import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  acceptHackathonMentorInvite,
  addHackathonMentorInvite,
  countOpenMentorPlaces,
  declineHackathonMentorInvite,
  listOrganiserHackathonMentors,
  readHackathonMentorInvite,
  readHeldJudgePlace,
  readHeldMentorPlace,
  removeHackathonMentor,
  saveHackathonMentorNote,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

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

export type MentorInviteCreated = {
  readonly mentorId: string;
  readonly token: string;
};

export type OrganiserMentorView = OrganiserPlaceView & {
  readonly helpsWith: string | null;
  readonly officeHours: string | null;
};

export type MentorInviteAnswered = PlaceAnswered;

const mentorPorts: PlacePorts = {
  role: 'mentor',
  idPrefix: 'mnt',
  countOpen: countOpenMentorPlaces,
  add: addHackathonMentorInvite,
  remove: (db, input) =>
    removeHackathonMentor(db, {
      eventId: input.eventId,
      mentorId: input.placeId,
    }),
  readInvite: readHackathonMentorInvite,
  readHeld: readHeldMentorPlace,
  readHeldOther: readHeldJudgePlace,
  decline: declineHackathonMentorInvite,
};

/**
 * Make an invite link for one mentor (B-HKN-25), as judges' links are made: one each, working
 * until it is answered or removed, with only the token's hash kept.
 */
export const createMentorInviteResolver = async (
  db: Db,
  input: Organiser,
  now: number = Date.now(),
): Promise<Result<MentorInviteCreated>> => {
  const made = await createPlaceInvite(db, mentorPorts, input, now);
  return made.ok
    ? ok({ mentorId: made.data.placeId, token: made.data.token })
    : made;
};

/** Remove a mentor's place, or the link nobody answered (B-HKN-25), until judging ends. */
export const removeMentorResolver = async (
  db: Db,
  input: Omit<Organiser, 'userId'> & { readonly mentorId: string },
  now: number = Date.now(),
): Promise<Result<{ readonly mentorId: string }>> => {
  const removed = await removePlaceResolver(
    db,
    mentorPorts,
    { ...input, placeId: input.mentorId },
    now,
  );
  return removed.ok ? ok({ mentorId: removed.data.placeId }) : removed;
};

/**
 * Every mentor's place for the hackathon's organisers (B-HKN-25), with who accepted each, what
 * they help with and their office hours.
 */
export const listMentorsResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<readonly OrganiserMentorView[]>> => {
  const loaded = await loadPlaceHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  return ok((await listOrganiserHackathonMentors(db, eventId)).map(placeView));
};

/**
 * Accept a mentor's invite link with what the member helps with and their office hours, or
 * decline it (B-HKN-25). A member who judges the hackathon cannot also mentor it.
 */
export const answerMentorInviteResolver = (
  db: Db,
  input: hackathons.HackathonMentorAnswerInput & { readonly userId: string },
  now: number = Date.now(),
): Promise<Result<MentorInviteAnswered>> =>
  answerPlaceInvite(
    db,
    mentorPorts,
    {
      token: input.token,
      answer: input.answer,
      userId: input.userId,
      accept: (tokenHash) =>
        input.answer === 'accept'
          ? acceptHackathonMentorInvite(db, {
              tokenHash,
              userId: input.userId,
              note: input.note,
            })
          : Promise.resolve(false),
    },
    now,
  );

/**
 * Change what the mentor helps with and their office hours (B-HKN-25): only a mentor who accepted,
 * while places can still change.
 */
export const saveMentorNoteResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly userId: string;
    readonly note: hackathons.HackathonMentorNote;
  },
  now: number = Date.now(),
): Promise<Result<{ readonly eventId: string }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async () =>
    hackathons.decideMentorNote({
      ...loaded.data,
      now,
      heldPlace: await readHeldMentorPlace(db, input),
    });
  const decided = await decide();
  if (!decided.ok) return decided;
  if (!(await saveHackathonMentorNote(db, input))) {
    const again = await decide();
    return again.ok
      ? err(new AppError('not_mentor', 'You do not mentor this hackathon'))
      : again;
  }
  logger.info('hackathon.mentor_note_saved', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
  });
  return ok({ eventId: input.eventId });
};
