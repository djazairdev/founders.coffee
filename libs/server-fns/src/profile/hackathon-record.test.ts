import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonCertificates,
  listHackathonRecordCertificates,
  projectMembers,
  projects,
  readHackathonRecordOffer,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  captain,
  codeOf,
  member,
  unwrap,
} from '../hackathons/judging.fixtures.js';
import { setHackathons } from '../hackathons/registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
} from '../hackathons/results.fixtures.js';
import { publishHackathonResultsResolver } from '../hackathons/results.js';
import {
  confirmProjectListingResolver,
  createProjectFromEntryResolver,
  publishProjectResolver,
} from '../projects/from-entry.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { setHackathonRecordShownResolver } from './hackathon-record.js';
import { readPublicProfile } from './resolver.js';

let db: Db;

const operator = members[3]?.id ?? '';

const afterResults = async () => {
  const setup = await judgingTwoEntries(db);
  await scoreBoth(db, setup);
  await judgingEnded(db, setup.eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
      actorUserId: operator,
    }),
  );
  return setup;
};

const recordOf = async (userId: string) =>
  unwrap(await readPublicProfile(db, userId)).hackathonRecord;

const show = (userId: string, isShown = true) =>
  setHackathonRecordShownResolver(db, { userId, isShown });

describe('the hackathon record on a profile (B-PRF-05, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
    unwrap(await show(captain, false));
    unwrap(await show(member, false));
  });

  it('stays off the profile until the member turns it on, then says what happened', async () => {
    const { eventId } = await afterResults();

    expect(await recordOf(captain)).toEqual([]);
    expect(
      await readHackathonRecordOffer(db, { eventId, userId: captain }),
    ).toEqual({ isShown: false });

    unwrap(await show(captain));

    expect(
      await readHackathonRecordOffer(db, { eventId, userId: captain }),
    ).toEqual({ isShown: true });
    const record = await recordOf(captain);
    const own = record.filter((entry) => entry.kind === 'participant');
    expect(own.length).toBeGreaterThan(0);
    expect(own[0]).toMatchObject({
      title: expect.any(String),
      slug: expect.any(String),
      marketSlug: expect.any(String),
      certificateCode: expect.any(String),
      projectSlug: null,
    });
  });

  it('names the project only once it is published and lists the member', async () => {
    const { eventId } = await afterResults();
    unwrap(await show(captain));
    unwrap(await show(member));
    const { projectId, slug } = unwrap(
      await createProjectFromEntryResolver(db, null, {
        eventId,
        userId: captain,
      }),
    );
    const slugFor = async (userId: string) =>
      (await recordOf(userId)).find((entry) => entry.projectSlug === slug)
        ?.projectSlug ?? null;

    expect(await slugFor(captain)).toBeNull();
    unwrap(
      await confirmProjectListingResolver(db, { projectId, userId: member }),
    );
    unwrap(
      await publishProjectResolver(db, null, { projectId, userId: captain }),
    );
    expect(await slugFor(member)).toBe(slug);

    await db
      .update(projectMembers)
      .set({ isListed: false })
      .where(eq(projectMembers.userId, member));
    expect(await slugFor(member)).toBeNull();

    await db
      .update(projects)
      .set({ status: 'hidden' })
      .where(eq(projects.id, projectId));
    expect(await slugFor(captain)).toBeNull();
  });

  it('never shows a revoked certificate, and offers nothing once all are gone', async () => {
    const { eventId } = await afterResults();
    unwrap(await show(captain));
    const fromThisHackathon = async () =>
      (await listHackathonRecordCertificates(db, captain)).filter(
        (row) => row.eventId === eventId,
      );
    const { slug } = (await fromThisHackathon())[0] ?? { slug: '' };
    expect((await recordOf(captain)).map((entry) => entry.slug)).toContain(
      slug,
    );

    await db
      .update(hackathonCertificates)
      .set({ revokedAt: new Date() })
      .where(eq(hackathonCertificates.eventId, eventId));

    expect((await recordOf(captain)).map((entry) => entry.slug)).not.toContain(
      slug,
    );
    expect(await fromThisHackathon()).toEqual([]);
    expect(
      await readHackathonRecordOffer(db, { eventId, userId: captain }),
    ).toBeNull();
  });

  it('hides the record where hackathons were turned off, and refuses an account with no profile', async () => {
    await afterResults();
    unwrap(await show(captain));

    await setHackathons(db, false);

    expect(await recordOf(captain)).toEqual([]);
    expect(codeOf(await show('usr_no_such_member'))).toBe('not_found');
  });
});
