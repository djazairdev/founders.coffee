import { beforeEach, describe, expect, it } from 'vitest';

import { listPublicHackathonPrizes, type Db } from '@founders-coffee/db';

import {
  codeOf,
  DAY,
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
  confirmHackathonPrizeResolver,
  removeHackathonPrizeResolver,
} from './prizes.js';

const NOTE = 'Signed letter from Amina at Djazair Cloud, sent 3 November';

describe("a prize's confirmation (B-HKN-10, real D1)", () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  const edit = (eventId: string, version: number) => ({
    eventId,
    version,
    organisationId: ORGANISATION,
  });

  const withPrize = async (overrides = {}, isPublished = false) => {
    const { eventId, version } = await hackathonWithDetails(
      db,
      overrides,
      isPublished,
    );
    const added = versionOf(
      await addHackathonPrizeResolver(db, {
        ...edit(eventId, version),
        prize: prize(),
      }),
    );
    const [saved] = (await readDraft(db, eventId)).prizes;
    return { eventId, version: added, prizeId: idOf(saved) };
  };

  const confirm = (
    target: { eventId: string; version: number; prizeId: string },
    now?: number,
  ) =>
    confirmHackathonPrizeResolver(
      db,
      {
        ...edit(target.eventId, target.version),
        prizeId: target.prizeId,
        note: NOTE,
      },
      now,
    );

  const confirmationOf = async (eventId: string) =>
    (await readDraft(db, eventId)).prizes[0]?.confirmation ?? null;

  it('records who confirmed a prize, when and how, for its organisers only, and shows the prize', async () => {
    const target = await withPrize();
    const now = Date.UTC(2098, 10, 3, 9);
    expect(await listPublicHackathonPrizes(db, target.eventId)).toEqual([]);

    const confirmed = versionOf(await confirm(target, now));

    expect(confirmed).toBe(target.version + 1);
    expect(await confirmationOf(target.eventId)).toEqual({
      confirmedAt: now,
      note: NOTE,
    });
    const [shown] = await listPublicHackathonPrizes(db, target.eventId);
    expect(shown).toMatchObject({ title: 'First prize' });
    expect(shown).not.toHaveProperty('confirmationNote');
    expect(JSON.stringify(shown)).not.toContain('Amina');
  });

  const change = (
    target: { eventId: string; prizeId: string },
    version: number,
    overrides = {},
  ) =>
    changeHackathonPrizeResolver(db, {
      ...edit(target.eventId, version),
      prizeId: target.prizeId,
      prize: prize(overrides),
    });

  it('keeps the confirmation through a new description or place', async () => {
    const target = await withPrize();
    const confirmed = versionOf(await confirm(target));

    versionOf(
      await change(target, confirmed, {
        description: 'A year of credits, and a mentor.',
        place: 2,
      }),
    );

    expect(await confirmationOf(target.eventId)).toMatchObject({ note: NOTE });
    expect(await listPublicHackathonPrizes(db, target.eventId)).toHaveLength(1);
  });

  it.each([
    ['value', { value: { amount_minor: 2_500_000, currency: 'DZD' } }],
    ['value', { value: null }],
    ['title', { title: 'Grand prize' }],
    ['provider', { providerName: 'Another sponsor' }],
  ])('takes the confirmation away with a new %s', async (_field, overrides) => {
    const target = await withPrize();
    const confirmed = versionOf(await confirm(target));

    versionOf(await change(target, confirmed, overrides));

    expect(await confirmationOf(target.eventId)).toBeNull();
    expect(await listPublicHackathonPrizes(db, target.eventId)).toEqual([]);
  });

  it('confirms a prize once, keeps it from being withdrawn, and refuses a stale version', async () => {
    const target = await withPrize();
    const confirmed = versionOf(await confirm(target));

    expect(codeOf(await confirm({ ...target, version: confirmed }))).toBe(
      'hackathon_field_locked',
    );
    expect(
      codeOf(
        await removeHackathonPrizeResolver(db, {
          ...edit(target.eventId, confirmed),
          prizeId: target.prizeId,
        }),
      ),
    ).toBe('hackathon_field_locked');

    const other = await withPrize();
    versionOf(
      await addHackathonPrizeResolver(db, {
        ...edit(other.eventId, other.version),
        prize: prize({ title: 'Second prize', place: 2 }),
      }),
    );
    expect(codeOf(await confirm({ ...other, version: other.version }))).toBe(
      'hackathon_conflict',
    );
  });

  it("confirms a late sponsor's prize after registration opens, and nothing once the hackathon is over", async () => {
    const opened = await withPrize(OPENED, true);
    versionOf(await confirm(opened));
    expect(await listPublicHackathonPrizes(db, opened.eventId)).toHaveLength(1);

    const over = await withPrize(OPENED, true);
    expect(codeOf(await confirm(over, Date.now() + 3650 * DAY))).toBe(
      'hackathon_not_editable',
    );
    expect(await confirmationOf(over.eventId)).toBeNull();
  });
});
