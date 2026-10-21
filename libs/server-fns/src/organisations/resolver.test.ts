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
    slug: `builders-${Math.random().toString(36).slice(2, 10)}`,
    kind: 'club',
    marketCode: 'DZ',
    cityCode: '556',
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

  it('files the organisation as pending, with the applicant as its owner', async () => {
    const userId = await signUp();
    const input = application();

    const result = await applyForOrganisationResolver(db, userId, input);

    expect(result).toMatchObject({
      ok: true,
      data: {
        name: input.name,
        slug: input.slug,
        kind: 'club',
        status: 'pending',
        marketCode: 'DZ',
        cityCode: '556',
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
    const input = application();

    const result = await applyForOrganisationResolver(db, userId, input);

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'hackathons_disabled' },
    });
    expect(
      await db
        .select()
        .from(organization)
        .where(eq(organization.slug, input.slug)),
    ).toEqual([]);
  });

  it('refuses an address another organisation holds, and makes nobody an owner', async () => {
    const first = await signUp();
    const second = await signUp();
    const input = application();
    await applyForOrganisationResolver(db, first, input);

    const result = await applyForOrganisationResolver(db, second, {
      ...input,
      name: 'Another club',
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'organisation_slug_taken' },
    });
    expect(
      await db
        .select({ userId: member.userId })
        .from(member)
        .where(eq(member.userId, second)),
    ).toEqual([]);
  });

  it('refuses a city outside the organisation’s market', async () => {
    const userId = await signUp();

    expect(
      await applyForOrganisationResolver(
        db,
        userId,
        application({ cityCode: 'not-a-city' }),
      ),
    ).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
  });

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
    const egypt = await applyForOrganisationResolver(
      db,
      userId,
      application({ marketCode: 'EG', cityCode: null }),
    );
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
