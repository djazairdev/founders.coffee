import { describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';

import { eraseClosedAccount } from './account-closure.js';
import { NOW, PAST, person, setupDb } from './account-closure.fixtures.js';
import { eq, member, organization, user, type Db } from './index.js';

const club = async (db: Db, members: [string, string][]) => {
  const organisationId = id('org');
  await db.insert(organization).values({
    id: organisationId,
    name: 'Closing Club',
    slug: `closing-${organisationId.slice(-16)}`,
    kind: 'club',
    status: 'approved',
    marketCode: 'DZ',
    description: 'A club whose owners come and go.',
  });
  for (const [userId, role] of members)
    await db.insert(member).values({
      id: id('mem'),
      organizationId: organisationId,
      userId,
      role,
    });
  return organisationId;
};

const close = async (db: Db, closing: { id: string; email: string }) => {
  await db
    .update(user)
    .set({ accountState: 'closing', closedAt: NOW })
    .where(eq(user.id, closing.id));
  return eraseClosedAccount(
    db,
    { id: closing.id, email: closing.email, phoneNumber: null },
    NOW,
  );
};

const ownerLeftAt = async (db: Db, organisationId: string) => {
  const [row] = await db
    .select({ ownerLeftAt: organization.ownerLeftAt })
    .from(organization)
    .where(eq(organization.id, organisationId));
  return row?.ownerLeftAt ?? null;
};

describe('closing an account leaves no organisation silently ownerless (B-ORG-12, real D1)', () => {
  it('stamps an organisation whose last owner closed, and removes the membership', async () => {
    const db = await setupDb();
    const owner = await person(db, 'Nadia');
    const helper = await person(db, 'Karim');
    const organisationId = await club(db, [
      [owner.id, 'owner'],
      [helper.id, 'admin'],
    ]);

    expect(await close(db, owner)).toBe(true);

    expect(await ownerLeftAt(db, organisationId)).toEqual(NOW);
    expect(
      await db
        .select({ userId: member.userId })
        .from(member)
        .where(eq(member.organizationId, organisationId)),
    ).toEqual([{ userId: helper.id }]);
  });

  it('leaves an organisation that still has another owner, or that the member did not own', async () => {
    const db = await setupDb();
    const leaving = await person(db, 'Lina');
    const other = await person(db, 'Sami');
    const coOwned = await club(db, [
      [leaving.id, 'owner'],
      [other.id, 'owner'],
    ]);
    const joined = await club(db, [
      [other.id, 'owner'],
      [leaving.id, 'admin'],
    ]);

    await close(db, leaving);

    expect(await ownerLeftAt(db, coOwned)).toBeNull();
    expect(await ownerLeftAt(db, joined)).toBeNull();
  });

  it('reads a role list as Better Auth does, so an owner among several roles counts', async () => {
    const db = await setupDb();
    const leaving = await person(db, 'Yasmine');
    const other = await person(db, 'Omar');
    const listed = await club(db, [[leaving.id, 'admin,owner']]);
    const sharedByList = await club(db, [
      [leaving.id, 'owner'],
      [other.id, 'member,owner'],
    ]);
    const lookalike = await club(db, [
      [leaving.id, 'owner'],
      [other.id, 'co-owner'],
    ]);

    await close(db, leaving);

    expect(await ownerLeftAt(db, listed)).toEqual(NOW);
    expect(await ownerLeftAt(db, sharedByList)).toBeNull();
    expect(await ownerLeftAt(db, lookalike)).toEqual(NOW);
  });

  it('keeps the first stamp of an organisation still waiting for an owner', async () => {
    const db = await setupDb();
    const leaving = await person(db, 'Rania');
    const organisationId = await club(db, [[leaving.id, 'owner']]);
    await db
      .update(organization)
      .set({ ownerLeftAt: PAST })
      .where(eq(organization.id, organisationId));

    await close(db, leaving);

    expect(await ownerLeftAt(db, organisationId)).toEqual(PAST);
  });

  it('stamps nothing for an account reopened before the erasure ran', async () => {
    const db = await setupDb();
    const owner = await person(db, 'Walid');
    const organisationId = await club(db, [[owner.id, 'owner']]);

    expect(
      await eraseClosedAccount(
        db,
        { id: owner.id, email: owner.email, phoneNumber: null },
        NOW,
      ),
    ).toBe(false);

    expect(await ownerLeftAt(db, organisationId)).toBeNull();
    expect(
      await db
        .select({ role: member.role })
        .from(member)
        .where(eq(member.organizationId, organisationId)),
    ).toEqual([{ role: 'owner' }]);
  });
});
