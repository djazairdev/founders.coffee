import { describe, expect, it } from 'vitest';

import { needsAdminSession, resolveAdminContext } from './admin-context.js';

const ACCESS_EMAIL = 'founder@founders.coffee';

type Env = Parameters<typeof resolveAdminContext>[1];

const envWith = (overrides: Record<string, unknown> = {}): Env =>
  ({
    CF_ACCESS_DISABLED: 'true',
    CF_ACCESS_DEV_EMAIL: ACCESS_EMAIL,
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    CF_ACCESS_AUD: 'aud',
    ...overrides,
  }) as unknown as Env;

const env = envWith();

const request = () => new Request('https://admin-staging.founders.coffee/');

const navigateTo = (path: string) =>
  new Request(new URL(path, request().url), {
    headers: { accept: 'text/html,application/xhtml+xml' },
  });

const withSession = (user: unknown) => ({
  resolveSession: async () => (user === null ? null : { user }),
});

const operator = {
  id: 'usr_operator',
  email: ACCESS_EMAIL,
  role: 'admin' as const,
};

const reasonOf = async (response: Response): Promise<string> =>
  ((await response.json()) as { error: string }).error;

describe('an operator whose two identities agree', () => {
  it('is admitted, carrying both identity keys for the audit trail', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession(operator),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context).toEqual({
        accessSubject: 'dev',
        accessEmail: ACCESS_EMAIL,
        userId: 'usr_operator',
        role: 'admin',
      });
    }
  });

  it('admits a moderator as well as an admin', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession({ ...operator, role: 'moderator' }),
    );

    expect(result.ok).toBe(true);
  });

  it('does not care how the identity provider capitalised the address', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession({ ...operator, email: 'Founder@Founders.Coffee' }),
    );

    expect(result.ok).toBe(true);
  });
});

describe('every way in that must fail closed', () => {
  it('refuses a request Access never vouched for', async () => {
    const result = await resolveAdminContext(
      request(),
      envWith({ CF_ACCESS_DISABLED: 'false' }),
      withSession(operator),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect(await reasonOf(result.response)).toMatch(/Cf-Access-Jwt/);
    }
  });

  it('refuses a verified Access identity with no session behind it', async () => {
    const result = await resolveAdminContext(request(), env, withSession(null));

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(await reasonOf(result.response)).toMatch(/No admin session/);
  });

  it('sends the admin home browser visit to sign-in after Access verifies it', async () => {
    const result = await resolveAdminContext(
      navigateTo('/'),
      env,
      withSession(null),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(303);
      expect(result.response.headers.get('location')).toBe('/login');
      expect(result.response.headers.get('cache-control')).toBe('no-store');
    }
  });

  it('still denies unverified home visits and requests for protected endpoints', async () => {
    const results = await Promise.all([
      resolveAdminContext(
        navigateTo('/'),
        envWith({ CF_ACCESS_DISABLED: 'false' }),
        withSession(null),
      ),
      resolveAdminContext(
        navigateTo('/_serverFn/query'),
        env,
        withSession(null),
      ),
      resolveAdminContext(
        navigateTo('/'),
        env,
        withSession({ ...operator, role: 'member' }),
      ),
    ]);
    for (const result of results) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        expect(result.response.headers.has('location')).toBe(false);
      }
    }
  });

  it('refuses a valid Access identity paired with somebody else’s session', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession({ ...operator, email: 'someone.else@founders.coffee' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(await reasonOf(result.response)).toMatch(/does not match/);
  });

  it('refuses a role this build does not define rather than defaulting', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession({ ...operator, role: 'superuser' }),
    );

    expect(result.ok).toBe(false);
  });

  it('refuses a member who is signed in but is not an operator', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession({ ...operator, role: 'member' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(await reasonOf(result.response)).toMatch(/not an operator/);
  });

  it('refuses an account with no role at all rather than defaulting one', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession({ id: operator.id, email: operator.email }),
    );

    expect(result.ok).toBe(false);
  });

  it('refuses a session that carries no email to correlate', async () => {
    const result = await resolveAdminContext(
      request(),
      env,
      withSession({ id: operator.id, role: 'admin' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(await reasonOf(result.response)).toMatch(/no identity/);
  });

  it('refuses when the guard is bypassed but no development email is set', async () => {
    const result = await resolveAdminContext(
      request(),
      envWith({ CF_ACCESS_DEV_EMAIL: undefined }),
      withSession(operator),
    );

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(await reasonOf(result.response)).toMatch(/does not match/);
  });
});

describe('what may be reached before signing in', () => {
  it('lets the sign-in page through, or the key is locked inside', () => {
    expect(needsAdminSession('/login')).toBe(false);
  });

  it('lets the auth endpoints through, including the callback', () => {
    expect(needsAdminSession('/api/auth/sign-in/email-otp')).toBe(false);
    expect(needsAdminSession('/api/auth/callback/google')).toBe(false);
  });

  it('guards everything else, including a route nobody has written yet', () => {
    for (const path of [
      '/',
      '/operations',
      '/moderation/hosts',
      '/_serverFn/abc123',
      '/api/anything-else',
    ])
      expect(needsAdminSession(path)).toBe(true);
  });

  it('is not fooled by a path that merely mentions the exempt ones', () => {
    expect(needsAdminSession('/logins')).toBe(true);
    expect(needsAdminSession('/events/login')).toBe(true);
    expect(needsAdminSession('/api/authz/escalate')).toBe(true);
  });
});
