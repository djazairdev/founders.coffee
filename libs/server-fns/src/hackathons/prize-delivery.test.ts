import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonPrizes,
  hackathonResults,
  type Db,
} from '@founders-coffee/db';
import { id } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { captain, codeOf, unwrap } from './judging.fixtures.js';
import {
  assignPrizeResolver,
  prizeDeliveryResolver,
  setPrizeDeliveryResolver,
} from './prize-delivery.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';
import { teamPageResolver } from './team-page.js';

let db: Db;

const operator = members[3]?.id ?? '';

const addPrize = async (eventId: string, place: number) => {
  const prizeId = id('prz');
  await db.insert(hackathonPrizes).values({
    id: prizeId,
    eventId,
    place,
    title: `Prize ${place}`,
    description: 'For a project the jury liked.',
    providerName: 'Founders Coffee',
    confirmationNote: 'Confirmed by email.',
    confirmedAt: new Date(),
  });
  return prizeId;
};

const afterResults = async () => {
  const setup = await judgingTwoEntries(db);
  await scoreBoth(db, setup);
  const prizeId = await addPrize(setup.eventId, 1);
  await judgingEnded(db, setup.eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
      actorUserId: operator,
    }),
  );
  const view = unwrap(await prizeDeliveryResolver(db, setup.eventId));
  const holder = view.prizes[0]?.submissionId ?? '';
  const other =
    view.entries.find((entry) => entry.submissionId !== holder)?.submissionId ??
    '';
  return { eventId: setup.eventId, prizeId, holder, other };
};

const prizeOf = async (eventId: string) =>
  unwrap(await prizeDeliveryResolver(db, eventId)).prizes[0];

describe('awarding and delivering prizes (B-PRZ-02, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows nothing before the results, then each prize with its holder, pending', async () => {
    const setup = await judgingTwoEntries(db);
    expect(unwrap(await prizeDeliveryResolver(db, setup.eventId))).toEqual({
      isOpen: false,
      prizes: [],
      entries: [],
    });

    const { eventId, holder } = await afterResults();
    expect(await prizeOf(eventId)).toMatchObject({
      submissionId: holder,
      status: 'pending',
      note: null,
    });
  });

  it('marks a prize sent then received, keeps the note, and lets a mistake be corrected', async () => {
    const { eventId, prizeId } = await afterResults();
    const mark = (
      status: 'pending' | 'sent' | 'received',
      note: string | null,
    ) => setPrizeDeliveryResolver(db, { eventId, prizeId, status, note });

    unwrap(await mark('sent', 'Sent by courier.'));
    expect(await prizeOf(eventId)).toMatchObject({
      status: 'sent',
      note: 'Sent by courier.',
    });
    unwrap(await mark('received', 'Signed for.'));
    expect((await prizeOf(eventId))?.status).toBe('received');
    unwrap(await mark('sent', null));
    expect(await prizeOf(eventId)).toMatchObject({
      status: 'sent',
      note: null,
    });
  });

  it('moves a prize to another entry and starts its delivery again, unless it was received', async () => {
    const { eventId, prizeId, holder, other } = await afterResults();
    unwrap(
      await setPrizeDeliveryResolver(db, {
        eventId,
        prizeId,
        status: 'sent',
        note: null,
      }),
    );

    unwrap(
      await assignPrizeResolver(db, { eventId, prizeId, submissionId: other }),
    );
    expect(await prizeOf(eventId)).toMatchObject({
      submissionId: other,
      status: 'pending',
    });

    unwrap(
      await setPrizeDeliveryResolver(db, {
        eventId,
        prizeId,
        status: 'received',
        note: null,
      }),
    );
    expect(
      codeOf(
        await assignPrizeResolver(db, {
          eventId,
          prizeId,
          submissionId: holder,
        }),
      ),
    ).toBe('prize_delivered');
  });

  it('refuses a disqualified entry, an unknown one, and another hackathon’s prize', async () => {
    const { eventId, prizeId, other } = await afterResults();
    const elsewhere = await afterResults();
    await db
      .update(hackathonResults)
      .set({ disqualifiedAt: new Date() })
      .where(eq(hackathonResults.submissionId, other));

    expect(
      codeOf(
        await assignPrizeResolver(db, {
          eventId,
          prizeId,
          submissionId: other,
        }),
      ),
    ).toBe('prize_entry_unavailable');
    expect(
      codeOf(
        await assignPrizeResolver(db, {
          eventId,
          prizeId,
          submissionId: 'sub_nothing',
        }),
      ),
    ).toBe('prize_entry_unavailable');
    expect(
      codeOf(
        await assignPrizeResolver(db, {
          eventId,
          prizeId: elsewhere.prizeId,
          submissionId: (await prizeOf(eventId))?.submissionId ?? '',
        }),
      ),
    ).toBe('hackathon_prize_not_found');
    expect(
      codeOf(
        await setPrizeDeliveryResolver(db, {
          eventId,
          prizeId: elsewhere.prizeId,
          status: 'sent',
          note: null,
        }),
      ),
    ).toBe('prize_not_awarded');
  });

  it('shows the winning team pending or delivered, and never the organisers’ note', async () => {
    const { eventId, prizeId } = await afterResults();
    const prizesOfCaptain = async () =>
      unwrap(await teamPageResolver(db, { eventId, userId: captain })).prizes;
    const own = unwrap(await prizeDeliveryResolver(db, eventId)).entries.find(
      (row) => row.teamName === 'Byte Club',
    );
    unwrap(
      await assignPrizeResolver(db, {
        eventId,
        prizeId,
        submissionId: own?.submissionId ?? '',
      }),
    );

    expect(await prizesOfCaptain()).toEqual([
      { prizeId, title: 'Prize 1', isDelivered: false },
    ]);
    unwrap(
      await setPrizeDeliveryResolver(db, {
        eventId,
        prizeId,
        status: 'sent',
        note: 'Only for us.',
      }),
    );
    expect((await prizesOfCaptain())[0]?.isDelivered).toBe(false);
    unwrap(
      await setPrizeDeliveryResolver(db, {
        eventId,
        prizeId,
        status: 'received',
        note: 'Only for us.',
      }),
    );
    const view = unwrap(
      await teamPageResolver(db, { eventId, userId: captain }),
    );
    expect(view.prizes[0]?.isDelivered).toBe(true);
    expect(JSON.stringify(view)).not.toContain('Only for us.');
  });
});
