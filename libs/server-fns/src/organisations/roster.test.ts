import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import {
  and,
  eq,
  invitation,
  member,
  organization,
  type Db,
} from '@founders-coffee/db';

import {
  answer,
  approvedOrganisation,
  authWith,
  codeOf,
  DAY_MS,
  freshTestbed,
  invited,
  signedInMember,
  type Member,
  type Testbed,
} from './invitations.fixtures.js';
import { acceptInvitationResolver } from './invitations.js';
import { myOrganisationResolver, removeMemberResolver } from './roster.js';

const setHackathons = (db: Db, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = 'DZ'`,
  );

let bed: Testbed;
let slug: string;

const slugOf = async (db: Db, organisationId: string) => {
  const [row] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organisationId));
  return row?.slug ?? '';
};

const pageFor = async (person: Member) => {
  const result = await myOrganisationResolver(bed.db, {
    userId: person.userId,
    slug,
  });
  if (!result.ok) throw result.error;
  return result.data;
};

const memberIdOf = async (person: Member) => {
  const [row] = await bed.db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, person.userId),
        eq(member.organizationId, bed.organisationId),
      ),
    );
  return row?.id ?? '';
};

const joined = async (role: 'admin' | 'member') => {
  const person = await signedInMember();
  const invitationId = await invited(bed, person.email, role);
  const accepted = await answer(
    bed,
    acceptInvitationResolver,
    person,
    invitationId,
  );
  if (!accepted.ok) throw accepted.error;
  return person;
};

const remove = (by: Member, memberId: string) =>
  removeMemberResolver(bed.db, authWith(bed.db), {
    headers: by.headers,
    organisationId: bed.organisationId,
    memberId,
    userId: by.userId,
  });

const review = (changes: Partial<typeof organization.$inferInsert>) =>
  bed.db
    .update(organization)
    .set(changes)
    .where(eq(organization.id, bed.organisationId));

describe('my organisation page (B-ORG-09, real D1)', () => {
  beforeEach(async () => {
    bed = await freshTestbed();
    await setHackathons(bed.db, true);
    slug = await slugOf(bed.db, bed.organisationId);
  });

  it('shows an owner the approval date, the members and the invitations still waiting', async () => {
    const approvedAt = new Date('2026-10-01T09:00:00Z');
    await review({ reviewedAt: approvedAt });
    const admin = await joined('admin');
    const waiting = await invited(bed, 'waiting@roster.test');
    const lapsed = await invited(bed, 'lapsed@roster.test');
    const cancelled = await invited(bed, 'cancelled@roster.test');
    await bed.db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - DAY_MS) })
      .where(eq(invitation.id, lapsed));
    await bed.db
      .update(invitation)
      .set({ status: 'canceled' })
      .where(eq(invitation.id, cancelled));

    const page = await pageFor(bed.owner);

    expect(page.review).toEqual({ status: 'approved', approvedAt });
    expect(page.canManage).toBe(true);
    expect(
      page.members.map(({ role, isYou, canRemove }) => ({
        role,
        isYou,
        canRemove,
      })),
    ).toEqual([
      { role: 'owner', isYou: true, canRemove: false },
      { role: 'admin', isYou: false, canRemove: true },
    ]);
    expect(page.members[1]?.memberId).toBe(await memberIdOf(admin));
    expect(
      page.invitations.map(({ id, email, isExpired }) => ({
        id,
        email,
        isExpired,
      })),
    ).toEqual(
      expect.arrayContaining([
        { id: waiting, email: 'waiting@roster.test', isExpired: false },
        { id: lapsed, email: 'lapsed@roster.test', isExpired: true },
      ]),
    );
    expect(page.invitations).toHaveLength(2);
  });

  it('lets an admin remove members but not the owner, and shows a member only the status', async () => {
    const admin = await joined('admin');
    const plain = await joined('member');

    const adminPage = await pageFor(admin);
    const rows = adminPage.members.map(({ role, canRemove }) => [
      role,
      canRemove,
    ]);
    expect(rows[0]).toEqual(['owner', false]);
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        ['admin', false],
        ['member', true],
      ]),
    );

    const memberPage = await pageFor(plain);
    expect(memberPage).toMatchObject({
      role: 'member',
      canManage: false,
      members: [],
      invitations: [],
    });
  });

  it('shows a pending, rejected or suspended organisation its status, and nothing to manage', async () => {
    expect((await pageFor(bed.owner)).review.status).toBe('approved');

    await review({ status: 'pending' });
    const pending = await pageFor(bed.owner);
    expect(pending.review).toMatchObject({ status: 'pending' });
    expect(pending.canManage).toBe(false);
    expect(pending.members).toEqual([]);

    const reviewedAt = new Date('2026-10-02T12:00:00Z');
    await review({
      status: 'rejected',
      reviewedAt,
      reviewNote: 'Add a website we can check.',
    });
    expect((await pageFor(bed.owner)).review).toEqual({
      status: 'rejected',
      reviewedAt,
      note: 'Add a website we can check.',
    });

    await review({ status: 'suspended', reviewNote: null });
    expect(await pageFor(bed.owner)).toMatchObject({
      review: { status: 'suspended', reviewedAt },
      canManage: false,
      invitations: [],
    });
  });

  it('answers as not found to an outsider, an unknown slug and a market with hackathons off', async () => {
    const outsider = await signedInMember();
    const elsewhere = await approvedOrganisation(bed.db, outsider.userId);

    const notFound = async (userId: string, asked: string) =>
      codeOf(await myOrganisationResolver(bed.db, { userId, slug: asked }));

    expect(await notFound(outsider.userId, slug)).toBe(
      'organisation_not_found',
    );
    expect(await notFound(bed.owner.userId, 'no-such-club')).toBe(
      'organisation_not_found',
    );
    expect(
      await notFound(bed.owner.userId, await slugOf(bed.db, elsewhere)),
    ).toBe('organisation_not_found');

    await setHackathons(bed.db, false);
    expect(await notFound(bed.owner.userId, slug)).toBe(
      'organisation_not_found',
    );
  });
});

describe('removing a member (B-ORG-09, real D1)', () => {
  beforeEach(async () => {
    bed = await freshTestbed();
    await setHackathons(bed.db, true);
    slug = await slugOf(bed.db, bed.organisationId);
  });

  it('removes a member, who no longer sees the organisation', async () => {
    const plain = await joined('member');

    const result = await remove(bed.owner, await memberIdOf(plain));

    expect(result.ok).toBe(true);
    expect(await memberIdOf(plain)).toBe('');
    expect(
      codeOf(
        await myOrganisationResolver(bed.db, { userId: plain.userId, slug }),
      ),
    ).toBe('organisation_not_found');
  });

  it('refuses to remove the owner or the member asking, and a member of another organisation', async () => {
    const admin = await joined('admin');
    const outsider = await signedInMember();
    await approvedOrganisation(bed.db, outsider.userId);
    const [elsewhere] = await bed.db
      .select({ id: member.id })
      .from(member)
      .where(eq(member.userId, outsider.userId));

    expect(codeOf(await remove(admin, await memberIdOf(bed.owner)))).toBe(
      'organisation_member_protected',
    );
    expect(codeOf(await remove(admin, await memberIdOf(admin)))).toBe(
      'organisation_member_protected',
    );
    expect(codeOf(await remove(bed.owner, elsewhere?.id ?? ''))).toBe(
      'organisation_member_not_found',
    );
    expect((await pageFor(bed.owner)).members).toHaveLength(2);
  });
});
