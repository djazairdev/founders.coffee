import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { id } from '@founders-coffee/core';
import {
  createDb,
  eq,
  member,
  organization,
  seed,
  user,
  type Db,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';

import {
  applyForOrganisationResolver,
  listMyOrganisationsResolver,
  updateOrganisationResolver,
} from './resolver.js';

const setHackathons = (db: Db, marketCode: string, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = ${marketCode}`,
  );

const application = (
  changes: Partial<organisations.OrganisationApplication> = {},
): organisations.OrganisationApplication =>
  organisations.organisationApplicationSchema.parse({
    name: 'Algiers Builders Club',
    kind: 'club',
    description: 'A club for students who build software in Algiers.',
    ...changes,
  });

let db: Db;

const signUp = async () => {
  const userId = id('usr');
  await db
    .insert(user)
    .values({ id: userId, name: 'Applicant', email: `${userId}@test.coffee` });
  return userId;
};

const membersOf = (organisationId: string) =>
  db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organisationId));

describe('organisation applications (B-ORG-04, real D1)', () => {
  beforeEach(async () => {
    db = createDb(env.DB);
    await seed(db);
    await setHackathons(db, 'DZ', true);
  });

  afterEach(async () => {
    await setHackathons(db, 'DZ', false);
    await setHackathons(db, 'EG', false);
  });

  it('files the organisation as active, with the applicant as its owner', async () => {
    const userId = await signUp();
    const input = application();

    const result = await applyForOrganisationResolver(db, userId, input);

    expect(result).toMatchObject({
      ok: true,
      data: {
        name: input.name,
        slug: 'algiers-builders-club',
        kind: 'club',
        marketCode: 'DZ',
        cityCode: null,
        status: 'approved',
        role: 'owner',
      },
    });
    if (!result.ok) return;
    expect(await membersOf(result.data.id)).toEqual([
      { userId, role: 'owner' },
    ]);
  });

  it('writes nothing while the market has hackathons off', async () => {
    await setHackathons(db, 'DZ', false);
    const userId = await signUp();
    const input = application({ name: 'Blocked Builders' });

    const result = await applyForOrganisationResolver(db, userId, input);

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'hackathons_disabled' },
    });
    expect(
      await db
        .select()
        .from(organization)
        .where(eq(organization.name, input.name)),
    ).toEqual([]);
  });

  it('allocates unique numeric suffixes for concurrent same-name applications', async () => {
    const users = await Promise.all([signUp(), signUp(), signUp()]);
    const results = await Promise.all(
      users.map((userId) =>
        applyForOrganisationResolver(
          db,
          userId,
          application({ name: 'Concurrent Builders' }),
        ),
      ),
    );
    const created = results.flatMap((result) =>
      result.ok ? [result.data] : [],
    );
    expect(created).toHaveLength(3);
    expect(new Set(created.map((row) => row.slug)).size).toBe(3);
    expect(created.map((row) => row.slug)).toContain('concurrent-builders');
    expect(
      created
        .filter((row) => row.slug !== 'concurrent-builders')
        .every((row) => /^concurrent-builders-\d{8}$/u.test(row.slug)),
    ).toBe(true);
    for (const [index, result] of results.entries()) {
      if (!result.ok) throw result.error;
      expect(await membersOf(result.data.id)).toEqual([
        { userId: users[index], role: 'owner' },
      ]);
    }
  });

  it.each(['نادي البرمجة', 'AI', 'Admin'])(
    'saves %s with a valid generated address and Algeria scope',
    async (name) => {
      const result = await applyForOrganisationResolver(
        db,
        await signUp(),
        application({ name }),
      );
      if (!result.ok) throw result.error;
      expect(result.data).toMatchObject({
        name,
        marketCode: 'DZ',
        cityCode: null,
      });
      expect(
        organisations.organisationSlugSchema.safeParse(result.data.slug)
          .success,
      ).toBe(true);
      expect(result.data.slug).toMatch(/-\d{8}$/u);
    },
  );

  it('lists the member’s organisations in markets with hackathons on, newest first', async () => {
    const userId = await signUp();
    const other = await signUp();
    await setHackathons(db, 'EG', true);
    const older = await applyForOrganisationResolver(db, userId, application());
    await db
      .update(organization)
      .set({ createdAt: new Date('2026-01-01T00:00:00Z') })
      .where(eq(organization.id, older.ok ? older.data.id : ''));
    const newer = await applyForOrganisationResolver(db, userId, application());
    const egypt = await applyForOrganisationResolver(db, userId, application());
    if (!egypt.ok) throw egypt.error;
    await db
      .update(organization)
      .set({ marketCode: 'EG' })
      .where(eq(organization.id, egypt.data.id));
    await applyForOrganisationResolver(db, other, application());
    await setHackathons(db, 'EG', false);

    const result = await listMyOrganisationsResolver(db, userId);

    expect(result.ok && result.data.map((row) => row.id)).toEqual([
      newer.ok && newer.data.id,
      older.ok && older.data.id,
    ]);
    expect(result.ok && result.data.every((row) => row.role === 'owner')).toBe(
      true,
    );
    expect(egypt.ok).toBe(true);
  });

  it('changes the profile, never the address, and reports the caller’s role', async () => {
    const userId = await signUp();
    const applied = await applyForOrganisationResolver(
      db,
      userId,
      application(),
    );
    if (!applied.ok) throw new Error('the application was refused');

    const result = await updateOrganisationResolver(db, {
      organisationId: applied.data.id,
      userId,
      changes: organisations.organisationEditSchema.parse({
        name: 'Algiers Builders',
        cityCode: null,
        websiteUrl: 'https://builders.dz',
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        name: 'Algiers Builders',
        slug: applied.data.slug,
        cityCode: null,
        websiteUrl: 'https://builders.dz',
        description: applied.data.description,
        role: 'owner',
      },
    });
  });

  it('refuses an edit while hackathons are off, or to a city outside the market', async () => {
    const userId = await signUp();
    const applied = await applyForOrganisationResolver(
      db,
      userId,
      application(),
    );
    if (!applied.ok) throw new Error('the application was refused');
    const edit = (changes: Record<string, unknown>) =>
      updateOrganisationResolver(db, {
        organisationId: applied.data.id,
        userId,
        changes: organisations.organisationEditSchema.parse(changes),
      });

    expect(await edit({ cityCode: 'not-a-city' })).toMatchObject({
      ok: false,
      error: { code: 'validation_failed' },
    });
    await setHackathons(db, 'DZ', false);
    expect(await edit({ name: 'Closed club' })).toMatchObject({
      ok: false,
      error: { code: 'hackathons_disabled' },
    });
    expect(
      (
        await db
          .select({ name: organization.name })
          .from(organization)
          .where(eq(organization.id, applied.data.id))
      )[0]?.name,
    ).toBe('Algiers Builders Club');
  });
});
