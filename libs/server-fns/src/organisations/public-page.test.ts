import { beforeAll, describe, expect, it } from 'vitest';

import {
  eq,
  events,
  listPublicOrganisationSlugs,
  markets,
  organization,
  user,
  type Db,
  type Event,
} from '@founders-coffee/db';
import { markets as marketRules } from '@founders-coffee/domain';

import {
  coOrganise,
  organisation,
  signUp,
} from '../events/organisers.fixtures.js';
import { setupDb } from '../events/resolver.fixtures.js';
import { hostAnEvent } from '../events/update.fixtures.js';
import { organisationPageResolver } from './public-page.js';

const MEMBER_ID = 'usr_orgpage_member1';
const DAY_MS = 86_400_000;

const moveTo = async (db: Db, event: Event, startsAt: Date) => {
  await db
    .update(events)
    .set({ startsAt, endsAt: new Date(startsAt.getTime() + 2 * 3_600_000) })
    .where(eq(events.id, event.id));
};

const page = async (db: Db, slug: string) => {
  const result = await organisationPageResolver(db, slug);
  if (!result.ok) throw result.error;
  return result.data;
};

const codeOf = async (db: Db, slug: string) => {
  const result = await organisationPageResolver(db, slug);
  return result.ok ? null : result.error.code;
};

describe("an organisation's public page (B-ORG-11, real D1)", () => {
  let db: Db;
  let led: Event;
  let coHosted: Event;
  let later: Event;
  let finished: Event;
  let draft: Event;
  let elsewhere: Event;

  beforeAll(async () => {
    db = await setupDb();
    await signUp(db, MEMBER_ID);
    await organisation(db, 'code-club', MEMBER_ID, { name: 'Code Club' });
    await organisation(db, 'gdg-algiers', MEMBER_ID, { name: 'GDG Algiers' });
    await organisation(db, 'waiting-club', MEMBER_ID, { status: 'pending' });
    await organisation(db, 'gone-club', MEMBER_ID, { status: 'suspended' });

    led = await hostAnEvent(db, { title: 'Led by the club' });
    await coOrganise(db, led.id, 'code-club', 'lead');
    coHosted = await hostAnEvent(db, { title: 'Co-hosted by the club' });
    await coOrganise(db, coHosted.id, 'gdg-algiers', 'lead');
    await coOrganise(db, coHosted.id, 'code-club');
    later = await hostAnEvent(db, { title: 'Later evening' });
    await coOrganise(db, later.id, 'code-club', 'lead');
    finished = await hostAnEvent(db, { title: 'Last month' });
    await coOrganise(db, finished.id, 'code-club', 'lead');
    draft = await hostAnEvent(db, { title: 'Not yet out' });
    await coOrganise(db, draft.id, 'code-club', 'lead');
    elsewhere = await hostAnEvent(db, { title: 'Another club alone' });
    await coOrganise(db, elsewhere.id, 'gdg-algiers', 'lead');

    const now = Date.now();
    await moveTo(db, led, new Date(now + DAY_MS));
    await moveTo(db, coHosted, new Date(now + 2 * DAY_MS));
    await moveTo(db, later, new Date(now + 3 * DAY_MS));
    await moveTo(db, finished, new Date(now - 30 * DAY_MS));
    await db
      .update(events)
      .set({ status: 'draft' })
      .where(eq(events.id, draft.id));
  });

  it('shows what the organisation is, without anything private', async () => {
    const { organisation: shown } = await page(db, 'code-club');

    expect(shown).toEqual({
      id: 'code-club',
      name: 'Code Club',
      slug: 'code-club',
      kind: 'club',
      description: 'Weekly coding evenings for students in Algiers.',
      websiteUrl: null,
      marketCode: 'DZ',
      cityCode: null,
    });
  });

  it('lists the published events it leads or co-hosts, upcoming soonest first and past apart', async () => {
    const { upcoming, past } = await page(db, 'code-club');

    expect(upcoming.map((event) => event.title)).toEqual([
      'Led by the club',
      'Co-hosted by the club',
      'Later evening',
    ]);
    expect(past.map((event) => event.title)).toEqual(['Last month']);
    expect(upcoming[1]?.runBy).toEqual({
      kind: 'co_hosted',
      organisations: [
        { name: 'GDG Algiers', slug: 'gdg-algiers' },
        { name: 'Code Club', slug: 'code-club' },
      ],
    });
    expect(upcoming[0]?.hostName).not.toBeNull();
  });

  it('drops the upcoming events of a host who may no longer be shown', async () => {
    await signUp(db, 'usr_orgpage_banned1');
    const hidden = await hostAnEvent(db, { title: 'Banned host evening' });
    await db
      .update(events)
      .set({ hostId: 'usr_orgpage_banned1' })
      .where(eq(events.id, hidden.id));
    await coOrganise(db, hidden.id, 'gdg-algiers', 'lead');
    await db
      .update(user)
      .set({ banned: true })
      .where(eq(user.id, 'usr_orgpage_banned1'));

    const { upcoming } = await page(db, 'gdg-algiers');

    expect(upcoming.map((event) => event.title)).toEqual(
      expect.not.arrayContaining(['Banned host evening']),
    );
    expect(upcoming.map((event) => event.title)).toContain(
      'Another club alone',
    );
  });

  it('answers as not found for a pending, a suspended or a missing organisation', async () => {
    for (const slug of ['waiting-club', 'gone-club', 'no-such-club'])
      expect(await codeOf(db, slug)).toBe('organisation_not_found');
  });

  it('answers as not found once its market is hidden from visitors', async () => {
    await organisation(db, 'hidden-club', MEMBER_ID);
    await db
      .update(organization)
      .set({ marketCode: 'EG' })
      .where(eq(organization.id, 'hidden-club'));
    await db
      .update(markets)
      .set({ state: 'dark' })
      .where(eq(markets.code, 'EG'));

    expect(await codeOf(db, 'hidden-club')).toBe('organisation_not_found');
  });

  it('gives the sitemap the approved organisations of markets visitors can see, the platform included', async () => {
    const slugs = await listPublicOrganisationSlugs(
      db,
      marketRules.VISIBLE_STATES,
    );

    expect(slugs).toEqual(
      expect.arrayContaining(['code-club', 'founders-coffee', 'gdg-algiers']),
    );
    for (const hidden of ['waiting-club', 'gone-club', 'hidden-club'])
      expect(slugs).not.toContain(hidden);
  });
});
