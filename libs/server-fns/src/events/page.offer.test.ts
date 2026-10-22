import { describe, expect, it } from 'vitest';

import { eq, events, type Db } from '@founders-coffee/db';

import {
  founderTrack,
  hackathonWithDetails,
  idOf,
  openSourceTrack,
  ORGANISATION,
  prize,
  readDraft,
  setupHackathonDb,
  versionOf,
} from '../hackathons/edit.fixtures.js';
import {
  addHackathonPrizeResolver,
  confirmHackathonPrizeResolver,
} from '../hackathons/prizes.js';
import { saveHackathonTracksResolver } from '../hackathons/tracks.js';
import { readEventPage } from './page.js';
import { createTestEvent } from './resolver.fixtures.js';

const anonymous = () => Promise.resolve(undefined);

const pageOf = async (db: Db, eventId: string) => {
  const [row] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId));
  const page = await readEventPage(
    db,
    { marketCode: 'DZ', slug: row?.slug ?? '' },
    anonymous(),
  );
  if (!page.ok) throw page.error;
  return page.data;
};

describe('a hackathon’s tracks and prizes on its page (B-HKN-18, real D1)', () => {
  it('shows its tracks in order and only the prizes whose provider confirmed', async () => {
    const db = await setupHackathonDb();
    const { eventId, version } = await hackathonWithDetails(db, {}, true);
    const edit = { eventId, organisationId: ORGANISATION };
    let at = versionOf(
      await saveHackathonTracksResolver(db, {
        ...edit,
        version,
        tracks: [
          { id: null, track: founderTrack('Payments for corner shops') },
          { id: null, track: openSourceTrack },
        ],
      }),
    );
    for (const title of ['Cloud credits', 'Mentoring'])
      at = versionOf(
        await addHackathonPrizeResolver(db, {
          ...edit,
          version: at,
          prize: prize({ title }),
        }),
      );
    const credits = (await readDraft(db, eventId)).prizes.find(
      (candidate) => candidate.title === 'Cloud credits',
    );
    versionOf(
      await confirmHackathonPrizeResolver(db, {
        ...edit,
        version: at,
        prizeId: idOf(credits),
        note: 'Signed letter from the provider.',
      }),
    );

    const page = await pageOf(db, eventId);

    expect(page.tracks.map((track) => [track.kind, track.title])).toEqual([
      ['founder_problem', 'Payments for corner shops'],
      ['open_source', 'Open source'],
    ]);
    expect(page.tracks[1]?.sourceUrls).toEqual([
      'https://github.com/djazairdev/founders.coffee',
    ]);
    expect(page.prizes).toEqual([
      {
        id: idOf(credits),
        trackId: null,
        place: 1,
        title: 'Cloud credits',
        description: 'Mentoring and cloud credits for the winning team.',
        providerName: 'Algiers Builders',
        value: { amount_minor: 5_000_000, currency: 'DZD' },
      },
    ]);
  });

  it('shows none on a meetup', async () => {
    const db = await setupHackathonDb();
    const meetup = await createTestEvent(db);

    const page = await pageOf(db, meetup.id);

    expect(page.tracks).toEqual([]);
    expect(page.prizes).toEqual([]);
  });
});
