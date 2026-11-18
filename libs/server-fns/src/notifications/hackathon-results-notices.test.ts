import { inArray } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  accountPreferences,
  and,
  eq,
  hackathonCertificates,
  hackathons as hackathonRows,
  scheduledNotifications,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  captain,
  judgeOf,
  member,
  submitted,
  unwrap,
} from '../hackathons/judging.fixtures.js';
import { setHackathons } from '../hackathons/registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
} from '../hackathons/results.fixtures.js';
import { publishHackathonResultsResolver } from '../hackathons/results.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { enqueueResultsNoticeBatch } from './hackathon-results-notices.js';

let db: Db;

const operator = members[3]?.id ?? '';

const published = async () => {
  const { eventId } = await submitted(db);
  await db
    .update(hackathonRows)
    .set({ resultsPublishedAt: new Date() })
    .where(eq(hackathonRows.eventId, eventId));
  return eventId;
};

const noticesOf = (eventId: string) =>
  db
    .select({
      userId: scheduledNotifications.userId,
      payload: scheduledNotifications.payload,
    })
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.eventId, eventId),
        eq(scheduledNotifications.templateKey, 'hackathon_results_published'),
      ),
    );

const recipientsOf = async (eventId: string) =>
  (await noticesOf(eventId)).map((row) => row.userId).sort();

describe('telling a hackathon its results are out (B-JDG-11, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
    await db
      .delete(accountPreferences)
      .where(eq(accountPreferences.userId, member));
    await db.update(user).set({ localePref: null }).where(eq(user.id, captain));
  });

  it('tells every registered participant and accepted judge, once', async () => {
    const eventId = await published();
    const judge = await judgeOf(db, eventId);
    await judgeOf(db, eventId, 'invited');
    const everyone = [captain, member, judge.userId].sort();
    const batch = { eventId, afterUserId: null, limit: 50 };

    expect(await enqueueResultsNoticeBatch(db, batch)).toEqual({
      written: 3,
      next: null,
    });
    expect(await recipientsOf(eventId)).toEqual(everyone);

    expect(await enqueueResultsNoticeBatch(db, batch)).toEqual({
      written: 0,
      next: null,
    });
    expect(await recipientsOf(eventId)).toEqual(everyone);
  });

  it('pages through the list without missing anyone or repeating anyone', async () => {
    const eventId = await published();
    const judge = await judgeOf(db, eventId);
    let afterUserId: string | null = null;
    let batches = 0;
    do {
      const { next }: { next: string | null } = await enqueueResultsNoticeBatch(
        db,
        { eventId, afterUserId, limit: 1 },
      );
      afterUserId = next;
      batches += 1;
    } while (afterUserId && batches < 10);

    expect(await recipientsOf(eventId)).toEqual(
      [captain, member, judge.userId].sort(),
    );
    expect(batches).toBeLessThanOrEqual(4);
  });

  it('writes in the reader’s language, links to the hackathon’s page and honours the off switch', async () => {
    const eventId = await published();
    await db.update(user).set({ localePref: 'ar' }).where(eq(user.id, captain));
    await db
      .insert(accountPreferences)
      .values({ userId: member, hackathons: false, hackathonsChannels: 0 });

    await enqueueResultsNoticeBatch(db, {
      eventId,
      afterUserId: null,
      limit: 50,
    });

    const notices = await noticesOf(eventId);
    expect(notices.map((row) => row.userId)).toEqual([captain]);
    const payload = notices[0]?.payload as {
      pushTitle: string;
      pushUrl: string;
    };
    expect(payload.pushTitle).toContain('نُشرت النتائج');
    expect(payload.pushUrl).toContain('/ar/');
    expect(payload.pushUrl).toContain('/e/');
  });

  it('tells a team that was scored its feedback is ready, and links to its team page', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await judgingEnded(db, setup.eventId);
    unwrap(
      await publishHackathonResultsResolver(db, null, {
        ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
        actorUserId: setup.judge.userId,
      }),
    );

    await enqueueResultsNoticeBatch(db, {
      eventId: setup.eventId,
      afterUserId: null,
      limit: 50,
    });

    const notices = await db
      .select({
        userId: scheduledNotifications.userId,
        templateKey: scheduledNotifications.templateKey,
        payload: scheduledNotifications.payload,
      })
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.eventId, setup.eventId),
          inArray(scheduledNotifications.templateKey, [
            'hackathon_results_feedback',
            'hackathon_results_published',
          ]),
        ),
      );
    const keyOf = (userId: string) =>
      notices.find((row) => row.userId === userId)?.templateKey;
    expect(keyOf(captain)).toBe('hackathon_results_feedback');
    expect(keyOf(member)).toBe('hackathon_results_feedback');
    expect(keyOf(setup.judge.userId)).toBe('hackathon_results_published');
    const read = notices.find((row) => row.userId === captain)?.payload as {
      pushUrl: string;
      pushBody: string;
    };
    expect(read.pushUrl).toContain(`/hackathon/${setup.eventId}/team`);
    expect(read.pushBody).toContain('ملاحظات الحكام');
  });

  it('writes nothing while the results are not out', async () => {
    const { eventId } = await submitted(db);

    expect(
      await enqueueResultsNoticeBatch(db, {
        eventId,
        afterUserId: null,
        limit: 50,
      }),
    ).toEqual({ written: 0, next: null });
    expect(await noticesOf(eventId)).toEqual([]);
  });

  it('links each member’s own certificate in the email, not in the push (B-CRT-03)', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await judgingEnded(db, setup.eventId);
    unwrap(
      await publishHackathonResultsResolver(db, null, {
        ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
        actorUserId: operator,
      }),
    );
    await enqueueResultsNoticeBatch(db, {
      eventId: setup.eventId,
      afterUserId: null,
      limit: 50,
    });

    const rows = await db
      .select({
        userId: scheduledNotifications.userId,
        templateKey: scheduledNotifications.templateKey,
        payload: scheduledNotifications.payload,
      })
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.eventId, setup.eventId));
    const told = rows.filter(({ templateKey }) =>
      ['hackathon_results_feedback', 'hackathon_results_published'].includes(
        templateKey,
      ),
    );
    const certificates = await db
      .select()
      .from(hackathonCertificates)
      .where(eq(hackathonCertificates.eventId, setup.eventId));
    expect(certificates.length).toBeGreaterThan(1);
    expect(told.length).toBeGreaterThan(1);

    for (const { userId, payload } of told) {
      const own = certificates.find((row) => row.userId === userId);
      const fields = payload as Record<string, string>;
      if (!own) continue;
      expect(fields.html).toContain(`/c/${own.verificationCode}`);
      expect(fields.text).toContain(`/c/${own.verificationCode}`);
      expect(fields.pushUrl).not.toContain('/c/');
      for (const other of certificates.filter((row) => row.userId !== userId))
        expect(fields.html).not.toContain(other.verificationCode);
    }
  });

  it('adds no certificate line once it is revoked', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await judgingEnded(db, setup.eventId);
    unwrap(
      await publishHackathonResultsResolver(db, null, {
        ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
        actorUserId: operator,
      }),
    );
    await db
      .update(hackathonCertificates)
      .set({ revokedAt: new Date() })
      .where(eq(hackathonCertificates.eventId, setup.eventId));
    await enqueueResultsNoticeBatch(db, {
      eventId: setup.eventId,
      afterUserId: null,
      limit: 50,
    });

    const rows = await db
      .select({ payload: scheduledNotifications.payload })
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.eventId, setup.eventId));
    expect(rows.length).toBeGreaterThan(0);
    for (const { payload } of rows)
      expect(JSON.stringify(payload)).not.toContain('/c/');
  });
});
