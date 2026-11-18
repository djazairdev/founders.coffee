import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathonPrizeAwards,
  hackathonPrizes,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  type JudgingTwoEntries,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';

let db: Db;

const addPrize = async (
  { eventId }: JudgingTwoEntries,
  values: { place: number; trackId?: string; isConfirmed?: boolean },
) => {
  const prizeId = id('prz');
  await db.insert(hackathonPrizes).values({
    id: prizeId,
    eventId,
    place: values.place,
    trackId: values.trackId ?? null,
    title: `Prize ${values.place}`,
    description: 'For the project in this place.',
    providerName: 'Founders Coffee',
    ...(values.isConfirmed === false
      ? {}
      : { confirmationNote: 'Confirmed by email.', confirmedAt: new Date() }),
  });
  return prizeId;
};

const publish = async (eventId: string) => {
  await judgingEnded(db, eventId);
  return publishHackathonResultsResolver(db, null, {
    ...hackathons.publishResultsSchema.parse({ eventId }),
    actorUserId: members[3]?.id ?? '',
  });
};

const awardOf = async (prizeId: string) =>
  (
    await db
      .select()
      .from(hackathonPrizeAwards)
      .where(eq(hackathonPrizeAwards.prizeId, prizeId))
  )[0];

describe('prize awards from the frozen ranks (B-PRZ-01, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('awards each confirmed prize to the entry holding its place, waiting for delivery', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    const first = await addPrize(setup, { place: 1 });
    const trackSecond = await addPrize(setup, {
      place: 2,
      trackId: setup.trackId,
    });

    unwrap(await publish(setup.eventId));

    expect(await awardOf(first)).toMatchObject({
      submissionId: setup.submissionId,
      awardedAt: expect.any(Date),
      deliveryStatus: 'pending',
      deliveredAt: null,
      privateNote: null,
    });
    expect((await awardOf(trackSecond))?.submissionId).toBe(
      setup.rival.submissionId,
    );
  });

  it('awards nothing for an unconfirmed prize or a place nobody holds', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    const unconfirmed = await addPrize(setup, {
      place: 1,
      isConfirmed: false,
    });
    const nobody = await addPrize(setup, { place: 3 });

    unwrap(await publish(setup.eventId));

    expect(await awardOf(unconfirmed)).toBeUndefined();
    expect(await awardOf(nobody)).toBeUndefined();
  });

  it('awards once: a second publish is refused and changes nothing', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    const first = await addPrize(setup, { place: 1 });
    unwrap(await publish(setup.eventId));
    const awarded = await awardOf(first);

    expect((await publish(setup.eventId)).ok).toBe(false);

    expect(await awardOf(first)).toEqual(awarded);
  });
});
