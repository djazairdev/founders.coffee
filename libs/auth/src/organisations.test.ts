import { env } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createDb,
  eq,
  member,
  organization,
  PLATFORM_ORGANISATION,
  seed,
} from '@founders-coffee/db';

import { authEnv, signIn } from './auth.fixtures.js';
import { createAuth } from './auth.js';
import { createAuthHandler } from './handler.js';
import { organisationHttpPaths, organisationPlugin } from './organisations.js';

const plugin = organisationPlugin();
const PATHS = organisationHttpPaths(plugin);

const methodOf = (path: string): string => {
  const endpoint = Object.values(plugin.endpoints).find(
    (candidate) => candidate.path === path,
  );
  const method = endpoint?.options.method;
  return (Array.isArray(method) ? method[0] : method) ?? 'POST';
};

const requestTo = (path: string, cookie: string): Request => {
  const method = methodOf(path);
  return new Request(`${env.APP_URL}/api/auth${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      origin: env.APP_URL,
      cookie,
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify({}) }),
  });
};

const application = (slug: string) => ({
  name: 'Code Club Alger',
  slug,
  kind: 'club',
  marketCode: 'DZ',
  description: 'Weekly coding evenings for students in Algiers.',
});

describe('the organisation plugin (B-ORG-01, real D1)', () => {
  beforeAll(async () => {
    await seed(createDb(env.DB));
  });

  it('lists every path the plugin mounts, and no team path since teams are off', () => {
    expect(PATHS).toContain('/organization/create');
    expect(PATHS).toContain('/organization/invite-member');
    expect(PATHS.every((path) => path.startsWith('/organization/'))).toBe(true);
    expect(PATHS.some((path) => path.includes('team'))).toBe(false);
  });

  it('gives Better Auth exactly those paths to disable', () => {
    const { auth } = createAuth(authEnv);
    expect(auth.options.disabledPaths).toEqual(PATHS);
  });

  it('answers 404 to a signed-in member on every plugin path, from the public handler, the internal one and Better Auth itself', async () => {
    const { auth, browserCookie } = await signIn('org-http@test.coffee');
    const publicHandler = createAuthHandler(authEnv);
    const internalHandler = createAuthHandler(authEnv, {
      captchaBypassed: true,
    });

    for (const path of PATHS) {
      for (const handle of [publicHandler, internalHandler, auth.handler]) {
        const response = await handle(requestTo(path, browserCookie));
        expect(response.status, path).toBe(404);
      }
    }
    expect(
      await createDb(env.DB).select({ id: organization.id }).from(organization),
    ).toEqual([{ id: PLATFORM_ORGANISATION.id }]);
  });

  it('creates an organisation through auth.api as pending, with our fields and its creator as owner', async () => {
    const { auth, browserCookie } = await signIn('org-owner@test.coffee');

    const created = await auth.api.createOrganization({
      body: application('code-club-alger'),
      headers: new Headers({ cookie: browserCookie }),
    });

    const db = createDb(env.DB);
    const [row] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, created?.id ?? ''));
    expect(row).toMatchObject({
      name: 'Code Club Alger',
      slug: 'code-club-alger',
      kind: 'club',
      status: 'pending',
      marketCode: 'DZ',
      cityCode: null,
      websiteUrl: null,
    });
    expect(
      await db
        .select({ role: member.role })
        .from(member)
        .where(eq(member.organizationId, row?.id ?? '')),
    ).toEqual([{ role: 'owner' }]);
  });
});
