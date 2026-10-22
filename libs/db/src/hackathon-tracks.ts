import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { HackathonTrackKind } from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  hackathonAtVersion,
  type HackathonEditWrite,
} from './hackathon-edits.js';
import { bound, nextPosition } from './insert-select.js';
import { hackathons, hackathonTracks, type HackathonTrack } from './schema.js';

export type HackathonTrackFields = {
  readonly kind: HackathonTrackKind;
  readonly title: string;
  readonly brief: string;
  readonly partnerName: string | null;
  readonly sourceUrls: readonly string[];
};

/**
 * Add a track after a hackathon's last one (B-HKN-03), selected from the hackathon's own row, so a
 * track is written only beside a hackathon that has its details.
 */
export const addHackathonTrack = (
  db: Db,
  input: {
    readonly id: string;
    readonly eventId: string;
    readonly track: HackathonTrackFields;
  },
) => {
  const { track } = input;
  return db.insert(hackathonTracks).select(
    db
      .select({
        id: bound(input.id, 'id'),
        eventId: hackathons.eventId,
        kind: bound(track.kind, 'kind'),
        title: bound(track.title, 'title'),
        brief: bound(track.brief, 'brief'),
        partnerName: bound(track.partnerName, 'partner_name'),
        sourceUrls: bound(JSON.stringify(track.sourceUrls), 'source_urls'),
        position: nextPosition(hackathonTracks, input.eventId),
        createdAt: sql`unixepoch()`.as('created_at'),
        updatedAt: sql`unixepoch()`.as('updated_at'),
      })
      .from(hackathons)
      .where(eq(hackathons.eventId, input.eventId)),
  );
};

/** A hackathon's tracks, in their order. */
export const listHackathonTracks = (
  db: Db,
  eventId: string,
): Promise<HackathonTrack[]> =>
  db
    .select()
    .from(hackathonTracks)
    .where(eq(hackathonTracks.eventId, eventId))
    .orderBy(asc(hackathonTracks.position));

const POSITION_OFFSET = 1000;

export type HackathonTrackEdit = {
  readonly id: string;
  readonly isNew: boolean;
  readonly track: HackathonTrackFields;
};

/**
 * The writes that make a hackathon's tracks the list an organiser saved (B-HKN-07), in its order:
 * removed tracks deleted, kept ones reworded in place under their own ids, so a prize that names
 * one still does, and new ones added. Kept tracks first move out of the way of the unique
 * `(event_id, position)` index, then each takes its place. Every write needs the hackathon at
 * `version`, for {@link applyHackathonEdit} to run with the version bump.
 */
export const hackathonTracksWrites = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly tracks: readonly HackathonTrackEdit[];
    readonly removedIds: readonly string[];
  },
): HackathonEditWrite[] => {
  const isCurrent = hackathonAtVersion(input.eventId, input.version);
  const ofEvent = eq(hackathonTracks.eventId, input.eventId);
  const removals =
    input.removedIds.length > 0
      ? [
          db
            .delete(hackathonTracks)
            .where(
              and(
                ofEvent,
                inArray(hackathonTracks.id, [...input.removedIds]),
                isCurrent,
              ),
            ),
        ]
      : [];
  const placed = input.tracks.map(({ id, isNew, track }, position) =>
    isNew
      ? db.insert(hackathonTracks).select(
          db
            .select({
              id: bound(id, 'id'),
              eventId: hackathons.eventId,
              kind: bound(track.kind, 'kind'),
              title: bound(track.title, 'title'),
              brief: bound(track.brief, 'brief'),
              partnerName: bound(track.partnerName, 'partner_name'),
              sourceUrls: bound(
                JSON.stringify(track.sourceUrls),
                'source_urls',
              ),
              position: bound(position, 'position'),
              createdAt: sql`unixepoch()`.as('created_at'),
              updatedAt: sql`unixepoch()`.as('updated_at'),
            })
            .from(hackathons)
            .where(and(eq(hackathons.eventId, input.eventId), isCurrent)),
        )
      : db
          .update(hackathonTracks)
          .set({
            kind: track.kind,
            title: track.title,
            brief: track.brief,
            partnerName: track.partnerName,
            sourceUrls: [...track.sourceUrls],
            position,
            updatedAt: new Date(),
          })
          .where(and(ofEvent, eq(hackathonTracks.id, id), isCurrent)),
  );
  return [
    ...removals,
    db
      .update(hackathonTracks)
      .set({ position: sql`${hackathonTracks.position} + ${POSITION_OFFSET}` })
      .where(and(ofEvent, isCurrent)),
    ...placed,
  ];
};
