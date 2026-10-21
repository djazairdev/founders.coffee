import { env } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';

import { AppError, type OrganisationStatus } from '@founders-coffee/core';
import { createDb, eq, organization, seed } from '@founders-coffee/db';

import { authEnv, signIn } from './auth.fixtures.js';
import { createAuth } from './auth.js';
import { getSession, type AuthSession } from './middleware.js';
import type {
  OrganisationAction,
  OrganisationResource,
} from './organisation-access.js';
import { authorizeOrganisationAction } from './organisation-permission.js';

type Caller = { headers: Headers; session: AuthSession };

const db = () => createDb(env.DB);

const callerFor = async (email: string): Promise<Caller> => {
  const { auth, browserCookie } = await signIn(email);
  const headers = new Headers({ cookie: browserCookie });
  const session = await getSession(auth, headers);
  if (!session) throw new Error(`no session for ${email}`);
  return { headers, session };
};

const setStatus = (organisationId: string, status: OrganisationStatus) =>
  db()
    .update(organization)
    .set({ status })
    .where(eq(organization.id, organisationId));

const refusal = async (promise: Promise<unknown>): Promise<string | null> => {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
};

describe('authorizeOrganisationAction (B-ORG-02, real D1)', () => {
  const { auth } = createAuth(authEnv);
  const people = {} as Record<
    'owner' | 'admin' | 'member' | 'outsider',
    Caller
  >;
  let organisationId = '';

  const ask = <R extends OrganisationResource>(
    caller: Caller | null,
    resource: R,
    action: OrganisationAction<R>,
    id = organisationId,
  ) =>
    refusal(
      authorizeOrganisationAction({
        auth,
        db: db(),
        headers: caller?.headers ?? new Headers(),
        session: caller?.session ?? null,
        organisationId: id,
        resource,
        action,
      }),
    );

  beforeAll(async () => {
    await seed(db());
    people.owner = await callerFor('org-perm-owner@test.coffee');
    people.admin = await callerFor('org-perm-admin@test.coffee');
    people.member = await callerFor('org-perm-member@test.coffee');
    people.outsider = await callerFor('org-perm-outsider@test.coffee');
    const created = await auth.api.createOrganization({
      body: {
        name: 'Code Club Oran',
        slug: 'code-club-oran',
        kind: 'club',
        marketCode: 'DZ',
        description: 'Weekly coding evenings for students in Oran.',
      },
      headers: people.owner.headers,
    });
    organisationId = created?.id ?? '';
    for (const role of ['admin', 'member'] as const) {
      await auth.api.addMember({
        body: {
          userId: people[role].session.user.id,
          role,
          organizationId: organisationId,
        },
      });
    }
    await setStatus(organisationId, 'approved');
  });

  it.each([
    ['owner', 'event', 'create', null],
    ['owner', 'hackathon', 'create', null],
    ['owner', 'hackathon', 'manage', null],
    ['owner', 'invitation', 'create', null],
    ['admin', 'event', 'create', null],
    ['admin', 'hackathon', 'create', null],
    ['admin', 'hackathon', 'manage', null],
    ['admin', 'invitation', 'create', null],
    ['member', 'event', 'create', null],
    ['member', 'hackathon', 'create', null],
    ['member', 'hackathon', 'manage', null],
    ['member', 'invitation', 'create', 'forbidden'],
    ['owner', 'invitation', 'cancel', null],
    ['admin', 'invitation', 'cancel', null],
    ['member', 'invitation', 'cancel', 'forbidden'],
    ['member', 'organization', 'update', 'forbidden'],
    ['admin', 'organization', 'delete', 'forbidden'],
    ['owner', 'organization', 'delete', null],
  ] as const)(
    'an approved organisation’s %s asking for %s:%s is refused with %s',
    async (role, resource, action, expected) => {
      expect(await ask(people[role], resource, action)).toBe(expected);
    },
  );

  it('refuses someone signed out, before anything is read', async () => {
    expect(await ask(null, 'event', 'create')).toBe('unauthenticated');
  });

  it('tells a non-member and a missing organisation the same thing', async () => {
    expect(await ask(people.outsider, 'event', 'create')).toBe('forbidden');
    expect(
      await ask(people.owner, 'event', 'create', 'no-such-organisation'),
    ).toBe('forbidden');
  });

  it.each(['pending', 'rejected', 'suspended'] as const)(
    'refuses every role of a %s organisation, and an outsider still learns nothing',
    async (status) => {
      await setStatus(organisationId, status);
      try {
        for (const role of ['owner', 'admin', 'member'] as const) {
          expect(await ask(people[role], 'event', 'create'), role).toBe(
            'organisation_not_approved',
          );
        }
        expect(await ask(people.member, 'invitation', 'create')).toBe(
          'forbidden',
        );
        expect(await ask(people.outsider, 'event', 'create')).toBe('forbidden');
      } finally {
        await setStatus(organisationId, 'approved');
      }
    },
  );
});
