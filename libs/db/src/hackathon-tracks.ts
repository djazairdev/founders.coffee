import { asc, eq, sql } from 'drizzle-orm';

import type { HackathonTrackKind } from '@founders-coffee/core';

import type { Db } from './db.js';
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
