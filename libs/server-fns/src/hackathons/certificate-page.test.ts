import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonCertificates,
  hackathonPrizes,
  user,
  type Db,
} from '@founders-coffee/db';
import { id } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { certificatePageResolver } from './certificate-page.js';
import { captain, unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';

let db: Db;

const published = async () => {
  const setup = await judgingTwoEntries(db);
  await scoreBoth(db, setup);
  await db.insert(hackathonPrizes).values({
    id: id('prz'),
    eventId: setup.eventId,
    place: 1,
    title: 'First prize',
    description: 'For the best project overall.',
    providerName: 'Founders Coffee',
    confirmationNote: 'Confirmed by email.',
    confirmedAt: new Date(),
  });
  await judgingEnded(db, setup.eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
      actorUserId: members[3]?.id ?? '',
    }),
  );
  return db
    .select()
    .from(hackathonCertificates)
    .where(eq(hackathonCertificates.eventId, setup.eventId));
};

const page = async (code: string) =>
  unwrap(await certificatePageResolver(db, code));

describe('the certificate page (B-CRT-02, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows the member, the hackathon, the kind and the placement', async () => {
    const rows = await published();
    const won = rows.find(
      (row) => row.userId === captain && row.kind === 'winner',
    );
    const [member] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, captain));

    expect(await page(won?.verificationCode ?? '')).toMatchObject({
      status: 'valid',
      memberName: member?.name,
      kind: 'winner',
      placement: 'First prize',
      hackathonTitle: expect.any(String),
      startsAt: expect.any(Number),
      timeZone: 'Africa/Algiers',
    });
  });

  it('says a revoked certificate was revoked, and no longer who held it', async () => {
    const rows = await published();
    const row = rows[0];
    await db
      .update(hackathonCertificates)
      .set({ revokedAt: new Date() })
      .where(eq(hackathonCertificates.id, row?.id ?? ''));

    expect(await page(row?.verificationCode ?? '')).toEqual({
      status: 'revoked',
    });
  });

  it('says it does not know a code it never issued', async () => {
    expect(await page('deadbeef')).toEqual({ status: 'unknown' });
  });
});
