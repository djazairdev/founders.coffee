import { beforeEach, describe, expect, it } from 'vitest';

import { type Db } from '@founders-coffee/db';
import type { hackathons } from '@founders-coffee/domain';

import { addHackathonPrizeResolver } from './prizes.js';
import {
  codeOf,
  draftHackathon,
  founderTrack,
  hackathonWithDetails,
  idOf,
  OPENED,
  openSourceTrack,
  ORGANISATION,
  prize,
  readDraft,
  setupHackathonDb,
  versionOf,
} from './edit.fixtures.js';
import { saveHackathonTracksResolver } from './tracks.js';

describe("a hackathon's tracks (B-HKN-07, real D1)", () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  const saveTracks = (
    eventId: string,
    version: number,
    tracks: { id: string | null; track: hackathons.HackathonTrackInput }[],
  ) =>
    saveHackathonTracksResolver(db, {
      eventId,
      version,
      organisationId: ORGANISATION,
      tracks,
    });

  it('waits for the details', async () => {
    const { eventId } = await draftHackathon(db);

    expect(
      codeOf(
        await saveTracks(eventId, 1, [{ id: null, track: openSourceTrack }]),
      ),
    ).toBe('hackathon_details_required');
  });

  it('saves the list in order, keeps ids, rewords, removes and adds', async () => {
    const { eventId, version } = await hackathonWithDetails(db);
    const first = versionOf(
      await saveTracks(eventId, version, [
        { id: null, track: founderTrack('Payments') },
        { id: null, track: openSourceTrack },
        { id: null, track: founderTrack('Hiring') },
      ]),
    );
    const [payments, openSource, hiring] = (await readDraft(db, eventId))
      .tracks;

    const second = versionOf(
      await saveTracks(eventId, first, [
        { id: idOf(hiring), track: founderTrack('Hiring and teams') },
        { id: null, track: founderTrack('Logistics') },
        { id: idOf(payments), track: founderTrack('Payments') },
      ]),
    );

    const read = await readDraft(db, eventId);
    expect(second).toBe(first + 1);
    expect(read.tracks.map(({ id, title }) => [id, title])).toEqual([
      [idOf(hiring), 'Hiring and teams'],
      [expect.stringMatching(/^trk_/), 'Logistics'],
      [idOf(payments), 'Payments'],
    ]);
    expect(read.tracks.some((track) => track.id === idOf(openSource))).toBe(
      false,
    );
    expect(openSource).toMatchObject({
      kind: 'open_source',
      partnerName: null,
      sourceUrls: ['https://github.com/djazairdev/founders.coffee'],
    });
  });

  it('removes no track once registration opens, nor one a prize names', async () => {
    const opened = await hackathonWithDetails(db, OPENED, true);
    const atOpening = versionOf(
      await saveTracks(opened.eventId, opened.version, [
        { id: null, track: founderTrack('Payments') },
        { id: null, track: founderTrack('Hiring') },
      ]),
    );
    const [payments] = (await readDraft(db, opened.eventId)).tracks;

    const removal = await saveTracks(opened.eventId, atOpening, [
      { id: idOf(payments), track: founderTrack('Payments') },
    ]);
    const rewordAndAdd = await saveTracks(opened.eventId, atOpening, [
      ...(await readDraft(db, opened.eventId)).tracks.map((track) => ({
        id: track.id,
        track: founderTrack(`${track.title}, again`),
      })),
      { id: null, track: openSourceTrack },
    ]);
    expect(removal.ok ? null : removal.error).toMatchObject({
      code: 'hackathon_field_locked',
      details: { fields: ['tracks'] },
    });
    expect(rewordAndAdd.ok).toBe(true);

    const open = await hackathonWithDetails(db);
    const withTracks = versionOf(
      await saveTracks(open.eventId, open.version, [
        { id: null, track: founderTrack('Payments') },
        { id: null, track: founderTrack('Hiring') },
      ]),
    );
    const [named, kept] = (await readDraft(db, open.eventId)).tracks;
    const withPrize = versionOf(
      await addHackathonPrizeResolver(db, {
        eventId: open.eventId,
        version: withTracks,
        organisationId: ORGANISATION,
        prize: prize({ trackId: idOf(named) }),
      }),
    );
    expect(
      codeOf(
        await saveTracks(open.eventId, withPrize, [
          { id: idOf(kept), track: founderTrack('Hiring') },
        ]),
      ),
    ).toBe('hackathon_track_has_prizes');
  });

  it('refuses another hackathon’s track and a stale page, writing nothing', async () => {
    const one = await hackathonWithDetails(db);
    const other = await hackathonWithDetails(db);
    versionOf(
      await saveTracks(other.eventId, other.version, [
        { id: null, track: founderTrack('Theirs') },
      ]),
    );
    const [theirs] = (await readDraft(db, other.eventId)).tracks;

    expect(
      codeOf(
        await saveTracks(one.eventId, one.version, [
          { id: idOf(theirs), track: founderTrack('Mine now') },
        ]),
      ),
    ).toBe('track_not_in_hackathon');
    expect(
      codeOf(
        await saveTracks(one.eventId, one.version - 1, [
          { id: null, track: founderTrack('Late') },
        ]),
      ),
    ).toBe('hackathon_conflict');
    expect((await readDraft(db, one.eventId)).tracks).toEqual([]);
  });
});
