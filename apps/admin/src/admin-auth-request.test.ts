import { describe, expect, it } from 'vitest';

import { authRequestIsForSelf } from './admin-context.js';

const ACCESS_EMAIL = 'operator@example.com';

const post = (body: unknown) =>
  new Request(
    'https://admin-staging.founders.coffee/api/auth/sign-in/email-otp',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

describe('an operator may only begin signing in as themselves', () => {
  it('allows a code for the address Access verified', async () => {
    expect(
      await authRequestIsForSelf(post({ email: ACCESS_EMAIL }), ACCESS_EMAIL),
    ).toBe(true);
  });

  it('refuses a code aimed at somebody else’s mailbox', async () => {
    expect(
      await authRequestIsForSelf(
        post({ email: 'victim@example.com' }),
        ACCESS_EMAIL,
      ),
    ).toBe(false);
  });

  it('ignores the capitalisation the operator typed', async () => {
    expect(
      await authRequestIsForSelf(
        post({ email: 'OPERATOR@EXAMPLE.COM' }),
        ACCESS_EMAIL,
      ),
    ).toBe(true);
  });

  it('leaves a body with no email alone, so sign-out still works', async () => {
    expect(await authRequestIsForSelf(post({}), ACCESS_EMAIL)).toBe(true);
  });

  it('leaves GET requests alone', async () => {
    expect(
      await authRequestIsForSelf(
        new Request(
          'https://admin-staging.founders.coffee/api/auth/get-session',
        ),
        ACCESS_EMAIL,
      ),
    ).toBe(true);
  });

  it('leaves an unparseable body to the handler rather than guessing', async () => {
    expect(
      await authRequestIsForSelf(
        new Request('https://admin-staging.founders.coffee/api/auth/x', {
          method: 'POST',
          body: 'not json',
        }),
        ACCESS_EMAIL,
      ),
    ).toBe(true);
  });

  it('does not consume the body it inspected', async () => {
    const request = post({ email: ACCESS_EMAIL });
    await authRequestIsForSelf(request, ACCESS_EMAIL);
    expect(await request.json()).toEqual({ email: ACCESS_EMAIL });
  });
});
