import { AppError, err, id, type Result } from '@founders-coffee/core';
import {
  hackathonTracksWrites,
  listHackathonTracks,
  listOrganiserHackathonPrizes,
  type Db,
  type HackathonTrackFields,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  hackathonDetailsRequired,
  hackathonNotEditable,
  loadHackathonEdit,
  runHackathonEdit,
} from './edit-context.js';

export type HackathonTrackSave = {
  readonly id: string | null;
  readonly track: hackathons.HackathonTrackInput;
};

/** A track as the database stores it, every field its kind does not use empty. */
const storedTrack = (
  track: hackathons.HackathonTrackInput,
): HackathonTrackFields => ({
  kind: track.kind,
  title: track.title,
  brief: track.brief,
  partnerName: track.kind === 'partner_technology' ? track.partnerName : null,
  sourceUrls: track.kind === 'open_source' ? track.sourceUrls : [],
});

const validationFailed = (message: string) =>
  err(new AppError('validation_failed', message));

/**
 * Save a hackathon's tracks as the list the organiser has, in its order (B-HKN-13, B-HKN-07): a
 * track with an `id` is one already saved and keeps it, one without is new, and a saved track left
 * out is removed.
 *
 * Tracks can be added and reworded until the hackathon is over, but removed only before registration
 * opens, since teams plan around them, and never while a prize names one. The write lands only on
 * the version the organiser saw, with the version bump, and answers the new version.
 */
export const saveHackathonTracksResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly organisationId: string;
    readonly tracks: readonly HackathonTrackSave[];
  },
  now: number = Date.now(),
): Promise<Result<{ readonly eventId: string; readonly version: number }>> => {
  const loaded = await loadHackathonEdit(db, input, now);
  if (!loaded.ok) return loaded;
  if (!loaded.data.details) return hackathonDetailsRequired();
  const { stage } = loaded.data;
  if (!hackathons.areTracksEditable(stage)) return hackathonNotEditable();
  const [saved, prizes] = await Promise.all([
    listHackathonTracks(db, input.eventId),
    listOrganiserHackathonPrizes(db, input.eventId),
  ]);
  const savedIds = new Set(saved.map((track) => track.id));
  const keptIds = input.tracks.flatMap((track) => (track.id ? [track.id] : []));
  if (new Set(keptIds).size !== keptIds.length)
    return validationFailed('Each track once');
  if (!keptIds.every((trackId) => savedIds.has(trackId)))
    return err(
      new AppError('track_not_in_hackathon', 'No such track in this hackathon'),
    );
  const removedIds = [...savedIds].filter(
    (trackId) => !keptIds.includes(trackId),
  );
  if (removedIds.length > 0 && !hackathons.isTrackRemovable(stage))
    return err(
      new AppError(
        'hackathon_field_locked',
        'Registration has opened, so tracks cannot be removed',
        { fields: ['tracks'] },
      ),
    );
  if (
    prizes.some((prize) => prize.trackId && removedIds.includes(prize.trackId))
  )
    return err(
      new AppError(
        'hackathon_track_has_prizes',
        'A prize names a track being removed',
      ),
    );
  return runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_tracks_saved',
    organisationId: input.organisationId,
    writes: hackathonTracksWrites(db, {
      eventId: input.eventId,
      version: input.version,
      removedIds,
      tracks: input.tracks.map((track) => ({
        id: track.id ?? id('trk'),
        isNew: track.id === null,
        track: storedTrack(track.track),
      })),
    }),
  });
};
