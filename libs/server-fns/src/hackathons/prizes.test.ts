import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyHackathonEdit,
  eq,
  events,
  hackathonPrizeRemoval,
  hackathonPrizes,
  type Db,
} from '@founders-coffee/db';

import {
  codeOf,
  hackathonWithDetails,
  idOf,
  OPENED,
  ORGANISATION,
  prize,
  readDraft,
  setupHackathonDb,
  versionOf,
} from './edit.fixtures.js';
import {
  addHackathonPrizeResolver,
  changeHackathonPrizeResolver,
  removeHackathonPrizeResolver,
} from './prizes.js';

describe("a hackathon's prizes (B-HKN-07, real D1)", () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  const edit = (eventId: string, version: number) => ({
    eventId,
    version,
    organisationId: ORGANISATION,
  });

  const confirm = (prizeId: string) =>
    db
      .update(hackathonPrizes)
      .set({ confirmedAt: new Date(), confirmationNote: 'Signed letter' })
      .where(eq(hackathonPrizes.id, prizeId));

  it('adds, rewords and withdraws an unconfirmed prize before registration opens', async () => {
    const { eventId, version } = await hackathonWithDetails(db);
    const added = versionOf(
      await addHackathonPrizeResolver(db, {
        ...edit(eventId, version),
        prize: prize(),
      }),
    );
    const [first] = (await readDraft(db, eventId)).prizes;
    expect(first).toMatchObject({
      title: 'First prize',
      value: { amount_minor: 5_000_000, currency: 'DZD' },
      confirmation: null,
    });

    const changed = versionOf(
      await changeHackathonPrizeResolver(db, {
        ...edit(eventId, added),
        prizeId: idOf(first),
        prize: prize({ title: 'Grand prize', value: null }),
      }),
    );
    expect((await readDraft(db, eventId)).prizes[0]).toMatchObject({
      title: 'Grand prize',
      value: null,
    });

    versionOf(
      await removeHackathonPrizeResolver(db, {
        ...edit(eventId, changed),
        prizeId: idOf(first),
      }),
    );
    expect((await readDraft(db, eventId)).prizes).toEqual([]);
  });

  it('withdraws no confirmed prize, and changes no prize once registration opens', async () => {
    const open = await hackathonWithDetails(db);
    const added = versionOf(
      await addHackathonPrizeResolver(db, {
        ...edit(open.eventId, open.version),
        prize: prize(),
      }),
    );
    const [confirmed] = (await readDraft(db, open.eventId)).prizes;
    await confirm(idOf(confirmed));
    expect(
      codeOf(
        await removeHackathonPrizeResolver(db, {
          ...edit(open.eventId, added),
          prizeId: idOf(confirmed),
        }),
      ),
    ).toBe('hackathon_field_locked');

    const opened = await hackathonWithDetails(db, OPENED, true);
    const late = versionOf(
      await addHackathonPrizeResolver(db, {
        ...edit(opened.eventId, opened.version),
        prize: prize({ title: 'Sponsor prize' }),
      }),
    );
    const [sponsor] = (await readDraft(db, opened.eventId)).prizes;
    expect(
      codeOf(
        await changeHackathonPrizeResolver(db, {
          ...edit(opened.eventId, late),
          prizeId: idOf(sponsor),
          prize: prize({ title: 'Smaller prize' }),
        }),
      ),
    ).toBe('hackathon_field_locked');
  });

  it('refuses a track of another hackathon and a prize it does not have', async () => {
    const { eventId, version } = await hackathonWithDetails(db);

    expect(
      codeOf(
        await addHackathonPrizeResolver(db, {
          ...edit(eventId, version),
          prize: prize({ trackId: 'trk_00000000000000000000000000000000' }),
        }),
      ),
    ).toBe('track_not_in_hackathon');
    expect(
      codeOf(
        await removeHackathonPrizeResolver(db, {
          ...edit(eventId, version),
          prizeId: 'prz_00000000000000000000000000000000',
        }),
      ),
    ).toBe('hackathon_prize_not_found');
  });

  it('moves no version when a prize was confirmed between the read and its withdrawal', async () => {
    const { eventId, version } = await hackathonWithDetails(db);
    const added = versionOf(
      await addHackathonPrizeResolver(db, {
        ...edit(eventId, version),
        prize: prize(),
      }),
    );
    const [first] = (await readDraft(db, eventId)).prizes;
    await confirm(idOf(first));

    const landed = await applyHackathonEdit(db, {
      eventId,
      version: added,
      writes: [
        hackathonPrizeRemoval(db, {
          eventId,
          version: added,
          prizeId: idOf(first),
        }),
      ],
      isSingleRow: true,
    });

    expect(landed).toBeNull();
    const [row] = await db
      .select({ version: events.version })
      .from(events)
      .where(eq(events.id, eventId));
    expect(row?.version).toBe(added);
    expect((await readDraft(db, eventId)).prizes[0]?.title).toBe('First prize');
  });
});
