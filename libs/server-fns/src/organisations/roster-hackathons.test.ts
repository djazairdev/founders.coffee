import { beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { eq, events, type Db, type Event } from '@founders-coffee/db';

import {
  coOrganise,
  organisation,
  signUp,
} from '../events/organisers.fixtures.js';
import { setupDb } from '../events/resolver.fixtures.js';
import { hostAnEvent } from '../events/update.fixtures.js';
import { myOrganisationResolver } from './roster.js';

const MEMBER_ID = 'usr_roster_hackathons';
const SECOND = 1000;

const hackathon = async (
  db: Db,
  title: string,
  organisationId: string,
  createdAt: Date,
): Promise<Event> => {
  const event = await hostAnEvent(db, { title });
  await db
    .update(events)
    .set({ kind: 'hackathon', status: 'draft', createdAt })
    .where(eq(events.id, event.id));
  await coOrganise(db, event.id, organisationId, 'lead');
  return event;
};

const pageOf = async (db: Db, slug: string) => {
  const result = await myOrganisationResolver(db, {
    userId: MEMBER_ID,
    slug,
  });
  if (!result.ok) throw result.error;
  return result.data;
};

describe("an organisation's hackathons on its own page (B-HKN-11, real D1)", () => {
  let db: Db;
  let older: Event;
  let newer: Event;

  beforeAll(async () => {
    db = await setupDb();
    await db.run(
      sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json('true')) WHERE code = 'DZ'`,
    );
    await signUp(db, MEMBER_ID);
    await organisation(db, 'code-club', MEMBER_ID);
    await organisation(db, 'gdg-algiers', MEMBER_ID);
    await organisation(db, 'waiting-club', MEMBER_ID, { status: 'pending' });

    const now = Date.now();
    older = await hackathon(
      db,
      'Spring build weekend',
      'code-club',
      new Date(now - 60 * SECOND),
    );
    newer = await hackathon(
      db,
      'Autumn build weekend',
      'code-club',
      new Date(now),
    );
    const theirs = await hackathon(
      db,
      'Led by the other club',
      'gdg-algiers',
      new Date(now),
    );
    await coOrganise(db, theirs.id, 'code-club');
    const meetup = await hostAnEvent(db, { title: 'A plain meetup' });
    await coOrganise(db, meetup.id, 'code-club', 'lead');
    await hackathon(db, 'Waiting club hackathon', 'waiting-club', new Date());
  });

  it('lists the hackathons it leads, drafts included, newest first', async () => {
    const page = await pageOf(db, 'code-club');

    expect(page.canCreateHackathon).toBe(true);
    expect(page.hackathons).toEqual([
      {
        id: newer.id,
        title: 'Autumn build weekend',
        cityCode: newer.cityCode,
        startsAt: newer.startsAt,
        endsAt: newer.endsAt,
        status: 'draft',
      },
      expect.objectContaining({ id: older.id, title: 'Spring build weekend' }),
    ]);
  });

  it('lets any member start one, not only an owner or admin', async () => {
    const page = await pageOf(db, 'code-club');

    expect(page.role).toBe('member');
    expect(page.canManage).toBe(false);
    expect(page.canCreateHackathon).toBe(true);
  });

  it('offers nothing to an organisation still waiting for review', async () => {
    const page = await pageOf(db, 'waiting-club');

    expect(page.canCreateHackathon).toBe(false);
    expect(page.hackathons).toEqual([]);
  });
});
