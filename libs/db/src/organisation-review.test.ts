import { beforeAll, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import { listAuditForTarget } from './operations-audit.js';
import {
  decideOrganisation,
  listOrganisationOwnerContacts,
  listOrganisationsForReview,
  ORGANISATION_REVIEW_PAGE,
} from './organisation-review.js';
import { member, organization, user } from './schema.js';

let db: Db;
let sequence = 0;

const ids = (prefix: string) => {
  sequence += 1;
  return `${prefix}_${String(sequence).padStart(32, '0')}`;
};

const application = async (createdAt: Date) => {
  const organisationId = ids('org');
  const ownerId = ids('usr');
  await db.insert(user).values({
    id: ownerId,
    name: `Owner ${sequence}`,
    email: `owner-${sequence}@review.test`,
    emailVerified: true,
    localePref: 'fr',
  });
  await db.insert(organization).values({
    id: organisationId,
    name: `Club ${sequence}`,
    slug: `club-review-${sequence}`,
    kind: 'club',
    status: 'pending',
    marketCode: 'DZ',
    description: 'A club waiting for a decision.',
    createdAt,
  });
  await db.insert(member).values({
    id: ids('mem'),
    organizationId: organisationId,
    userId: ownerId,
    role: 'owner',
  });
  return organisationId;
};

const decide = (
  organisationId: string,
  from: 'pending' | 'approved' | 'suspended',
  to: 'approved' | 'rejected' | 'suspended',
  note: string | null = null,
) =>
  decideOrganisation(db, {
    organisationId,
    from,
    to,
    note,
    action: to,
    actorUserId: 'usr_operator',
    accessSubject: 'access-subject-1',
    auditId: ids('aud'),
  });

const trail = (organisationId: string) =>
  listAuditForTarget(db, {
    targetType: 'organisation',
    targetId: organisationId,
    limit: 10,
  });

describe('reviewing organisations (B-ORG-06, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
    await db
      .insert(user)
      .values({
        id: 'usr_operator',
        name: 'Operator',
        email: 'operator@review.test',
        emailVerified: true,
        role: 'admin',
      })
      .onConflictDoNothing();
  });

  it('queues applications oldest first, each with its owner’s name', async () => {
    const newer = await application(new Date('2026-10-02T09:00:00Z'));
    const older = await application(new Date('2026-10-01T09:00:00Z'));

    const queue = await listOrganisationsForReview(db, 'pending');
    const positions = [older, newer].map((id) =>
      queue.items.findIndex((row) => row.id === id),
    );

    expect(positions[0]).toBeLessThan(positions[1] ?? -1);
    expect(queue.items.find((row) => row.id === older)).toMatchObject({
      ownerName: expect.stringMatching(/^Owner \d+$/),
      timeZone: 'Africa/Algiers',
    });
  });

  it('records a decision with its note, date and audit entry together', async () => {
    const id = await application(new Date());

    const decided = await decide(id, 'pending', 'rejected', 'Not a club.');

    expect(decided).toMatchObject({
      status: 'rejected',
      reviewNote: 'Not a club.',
    });
    expect(decided?.reviewedAt).toBeInstanceOf(Date);
    expect(await trail(id)).toEqual([
      expect.objectContaining({
        action: 'rejected',
        actorUserId: 'usr_operator',
        accessSubject: 'access-subject-1',
        marketCode: 'DZ',
        metadata: { from: 'pending', to: 'rejected' },
      }),
    ]);
  });

  it('changes nothing and leaves no trail when the status already moved', async () => {
    const id = await application(new Date());
    await decide(id, 'pending', 'approved');

    expect(await decide(id, 'pending', 'rejected', 'Too late.')).toBeNull();
    const [row] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, id));
    expect(row?.status).toBe('approved');
    expect((await trail(id)).map((entry) => entry.action)).toEqual([
      'approved',
    ]);
  });

  it('suspends and reinstates, clearing the note when none is given', async () => {
    const id = await application(new Date());
    await decide(id, 'pending', 'approved');
    await decide(id, 'approved', 'suspended', 'Reports to check.');

    const reinstated = await decide(id, 'suspended', 'approved');

    expect(reinstated).toMatchObject({ status: 'approved', reviewNote: null });
    expect(
      (await listOrganisationsForReview(db, 'suspended')).items,
    ).not.toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
  });

  it('pages a long queue, saying when another page follows', async () => {
    const rejected = Array.from(
      { length: ORGANISATION_REVIEW_PAGE + 1 },
      (_, index) => ({
        id: ids('org'),
        name: `Rejected club ${index}`,
        slug: `rejected-club-${sequence}`,
        kind: 'club' as const,
        status: 'rejected' as const,
        marketCode: 'DZ',
        description: 'A club that was turned down.',
        createdAt: new Date(Date.UTC(2100, 0, 1, 0, index)),
      }),
    );
    for (const row of rejected) await db.insert(organization).values(row);

    const pages = [];
    let page = 0;
    for (;;) {
      const next = await listOrganisationsForReview(db, 'rejected', page);
      pages.push(next);
      if (!next.hasMore) break;
      page += 1;
    }
    const listed = pages.flatMap((next) => next.items.map((row) => row.id));

    expect(pages[0]?.items).toHaveLength(ORGANISATION_REVIEW_PAGE);
    expect(listed.slice(-rejected.length)).toEqual(
      rejected.map((row) => row.id),
    );
  });

  it('lists the owners to tell, with the language each chose', async () => {
    const id = await application(new Date());

    expect(await listOrganisationOwnerContacts(db, id)).toEqual([
      { email: `owner-${sequence - 1}@review.test`, localePref: 'fr' },
    ]);
  });
});
