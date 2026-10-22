import { describe, expect, it } from 'vitest';

import {
  createEventIfRouteAvailable,
  eq,
  events,
  organization,
  user,
  type Db,
} from '@founders-coffee/db';

import {
  DAY,
  hackathonWithDetails,
  ORGANISATION,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import {
  answerMentorInviteResolver,
  createMentorInviteResolver,
} from '../hackathons/mentors.js';
import { readEventPage } from './page.js';
import {
  baseEvent,
  createTestEvent,
  nextId,
  TEST_HOST_ID,
} from './resolver.fixtures.js';

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

const mentor = async (
  db: Db,
  eventId: string,
  userId: string,
  answer: 'accept' | 'decline',
) => {
  await db.insert(user).values({
    id: userId,
    name: `Mentor ${userId}`,
    email: `${userId}@mentors.test`,
    emailVerified: true,
    role: 'member',
  });
  const made = await createMentorInviteResolver(db, {
    eventId,
    userId: TEST_HOST_ID,
    organisationId: ORGANISATION,
  });
  if (!made.ok) throw made.error;
  const answered = await answerMentorInviteResolver(db, {
    token: made.data.token,
    answer,
    note: { helpsWith: 'Pitching', officeHours: 'Tuesdays 18:00–20:00' },
    userId,
  });
  if (!answered.ok) throw answered.error;
};

const workshop = async (
  db: Db,
  input: {
    readonly title: string;
    readonly startsAt: number;
    readonly organisationId?: string;
    readonly kind?: 'workshop' | 'meetup';
  },
) => {
  const id = nextId();
  const created = await createEventIfRouteAvailable(
    db,
    {
      ...baseEvent(id, `workshop-${id}`),
      title: input.title,
      kind: input.kind ?? 'workshop',
      startsAt: new Date(input.startsAt),
      status: 'published',
    },
    input.organisationId ?? ORGANISATION,
  );
  if (!created) throw new Error(`${input.title} was not published`);
  return id;
};

describe('a hackathon’s mentors and workshops on its page (B-HKN-26, real D1)', () => {
  it('names the mentors who accepted, with what they help with and when', async () => {
    const db = await setupHackathonDb();
    const { eventId } = await hackathonWithDetails(db, {}, true);
    await mentor(db, eventId, 'usr_page_mentor_a', 'accept');
    await mentor(db, eventId, 'usr_page_mentor_b', 'decline');

    expect((await pageOf(db, eventId)).mentors).toEqual([
      {
        userId: 'usr_page_mentor_a',
        name: 'Mentor usr_page_mentor_a',
        photoAssetId: null,
        helpsWith: 'Pitching',
        officeHours: 'Tuesdays 18:00–20:00',
      },
    ]);
  });

  it('lists the workshops its organisations run from registration until kickoff', async () => {
    const db = await setupHackathonDb();
    const { eventId, kickoff } = await hackathonWithDetails(db, {}, true);
    await db.insert(organization).values({
      id: 'org_other_workshops',
      name: 'Another club',
      slug: 'another-club',
      kind: 'club',
      status: 'approved',
      marketCode: 'DZ',
      description: 'A club that runs its own workshops.',
    });
    const second = await workshop(db, {
      title: 'Pitch clinic',
      startsAt: kickoff - 3 * DAY,
    });
    const first = await workshop(db, {
      title: 'Git for teams',
      startsAt: kickoff - 10 * DAY,
    });
    await workshop(db, { title: 'Too early', startsAt: Date.now() - DAY });
    await workshop(db, { title: 'After kickoff', startsAt: kickoff + DAY });
    await workshop(db, {
      title: 'Not theirs',
      startsAt: kickoff - 5 * DAY,
      organisationId: 'org_other_workshops',
    });
    await workshop(db, {
      title: 'A meetup',
      startsAt: kickoff - 4 * DAY,
      kind: 'meetup',
    });

    const page = await pageOf(db, eventId);

    expect(page.workshops.map((listed) => listed.id)).toEqual([first, second]);
    expect(page.workshops[0]).toMatchObject({
      title: 'Git for teams',
      slug: `workshop-${first}`,
      startsAt: new Date(kickoff - 10 * DAY),
    });
  });

  it('carries no mentors or workshops for a meetup', async () => {
    const db = await setupHackathonDb();
    const { slug } = await createTestEvent(db);

    const page = await readEventPage(
      db,
      { marketCode: 'DZ', slug },
      anonymous(),
    );

    if (!page.ok) throw page.error;
    expect(page.data.mentors).toEqual([]);
    expect(page.data.workshops).toEqual([]);
  });
});
