import { createDb, eq, memberProfiles, seed, user } from '@founders-coffee/db';
import { LOCALES } from '@founders-coffee/core/locale';
import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import worker from '../src/server';

const PRODUCTION_ORIGIN = 'https://founders.coffee';
const productionEnv = {
  ...env,
  APP_ENVIRONMENT: 'production',
  APP_URL: PRODUCTION_ORIGIN,
};

const LISTED = 'usr_prf04_listed';
const UNLISTED = 'usr_prf04_unlisted';
const TURNED_OFF = 'usr_prf04_turned_off';
const BANNED = 'usr_prf04_banned';
const UNNAMED = 'usr_prf04_unnamed';
const PRIVATE_HEADLINE = 'Kept to myself: raising a seed round';
const GITHUB = 'https://github.com/listed-builder';

const fetchAt = async (
  path: string,
  requestEnv: typeof env = productionEnv,
): Promise<Response> => {
  const context = createExecutionContext();
  const response = await worker.fetch(
    new Request(`${PRODUCTION_ORIGIN}${path}`, {
      headers: { accept: 'text/html' },
    }),
    requestEnv,
    context,
  );
  await waitOnExecutionContext(context);
  return response;
};

const jsonLd = (body: string): Record<string, unknown>[] =>
  [
    ...body.matchAll(
      /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/giu,
    ),
  ].map((match) => JSON.parse(match[1]) as Record<string, unknown>);

const canonicalOf = (body: string): string | null =>
  /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["']/iu.exec(
    body,
  )?.[1] ?? null;

const metaRobotsOf = (body: string): string | null =>
  /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["']([^"']+)["']/iu.exec(
    body,
  )?.[1] ?? null;

const profilesInSitemap = async (): Promise<string[]> => {
  const sitemap = await worker.fetch(
    new Request(`${PRODUCTION_ORIGIN}/sitemap.xml`),
    productionEnv,
    createExecutionContext(),
  );
  return [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/gu)]
    .map((match) => new URL(match[1]).pathname)
    .filter((path) => path.includes('/u/'));
};

const member = (id: string, name: string, banned = false) => ({
  id,
  name,
  email: `${id}@test.coffee`,
  banned,
});

describe('a profile its member chose to show in search engines (B-PRF-04)', () => {
  beforeAll(async () => {
    const db = createDb(env.DB);
    await seed(db);
    await db
      .insert(user)
      .values([
        member(LISTED, 'Listed Builder'),
        member(UNLISTED, 'Unlisted Builder'),
        member(TURNED_OFF, 'Changed Mind'),
        member(BANNED, 'Banned Builder', true),
        member(UNNAMED, `${UNNAMED}@test.coffee`),
      ])
      .onConflictDoNothing()
      .run();
    await db
      .insert(memberProfiles)
      .values([
        {
          userId: LISTED,
          headline: PRIVATE_HEADLINE,
          links: [GITHUB, 'https://www.linkedin.com/in/listed-builder'],
          publishLinks: true,
          profileIndexable: true,
        },
        { userId: UNLISTED, links: [GITHUB], publishLinks: true },
        { userId: TURNED_OFF, profileIndexable: true },
        { userId: BANNED, profileIndexable: true },
        { userId: UNNAMED, profileIndexable: true },
      ])
      .onConflictDoNothing()
      .run();
  });

  it.each(LOCALES)(
    'drops noindex, gives a canonical and a ProfilePage with the published links, in %s',
    async (locale) => {
      const response = await fetchAt(`/${locale}/u/${LISTED}`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('x-robots-tag')).toBe('index, follow');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(metaRobotsOf(body)).toBe('index,follow');
      expect(canonicalOf(body)).toBe(
        `${PRODUCTION_ORIGIN}/${locale}/u/${LISTED}`,
      );
      const page = jsonLd(body).find(
        (schema) => schema['@type'] === 'ProfilePage',
      );
      expect(page).toMatchObject({
        url: `${PRODUCTION_ORIGIN}/${locale}/u/${LISTED}`,
        inLanguage: locale,
        name: 'Listed Builder',
        mainEntity: {
          '@type': 'Person',
          name: 'Listed Builder',
          sameAs: [GITHUB, 'https://www.linkedin.com/in/listed-builder'],
        },
      });
      expect(
        body,
        'the headline was never published, so neither the page nor its JSON-LD may carry it',
      ).not.toContain(PRIVATE_HEADLINE);
      expect(body).not.toContain(`${LISTED}@test.coffee`);
    },
  );

  it.each(LOCALES)(
    'keeps a profile its member did not list noindex, without a canonical, in %s',
    async (locale) => {
      const response = await fetchAt(`/${locale}/u/${UNLISTED}`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(metaRobotsOf(body)).toBe('noindex, nofollow');
      expect(canonicalOf(body)).toBeNull();
      expect(
        jsonLd(body).some((schema) => schema['@type'] === 'ProfilePage'),
      ).toBe(false);
    },
  );

  it('lists only the profiles that can be shown and chose to be', async () => {
    const paths = await profilesInSitemap();

    expect(paths.filter((path) => path.endsWith(`/u/${LISTED}`))).toEqual(
      LOCALES.map((locale) => `/${locale}/u/${LISTED}`),
    );
    for (const left of [UNLISTED, BANNED, UNNAMED])
      expect(paths.some((path) => path.endsWith(`/u/${left}`))).toBe(false);
    expect((await fetchAt(`/en/u/${BANNED}`)).status).toBe(404);
    expect((await fetchAt(`/en/u/${UNNAMED}`)).status).toBe(404);
  });

  it('restores noindex and leaves the sitemap on the next request once turned off', async () => {
    const before = await fetchAt(`/fr/u/${TURNED_OFF}`);
    expect(before.headers.get('x-robots-tag')).toBe('index, follow');
    expect(await profilesInSitemap()).toContain(`/fr/u/${TURNED_OFF}`);

    await createDb(env.DB)
      .update(memberProfiles)
      .set({ profileIndexable: false })
      .where(eq(memberProfiles.userId, TURNED_OFF))
      .run();

    const after = await fetchAt(`/fr/u/${TURNED_OFF}`);
    expect(after.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(canonicalOf(await after.text())).toBeNull();
    expect(await profilesInSitemap()).not.toContain(`/fr/u/${TURNED_OFF}`);
  });

  it('stays noindex outside production, listed or not', async () => {
    const response = await fetchAt(`/en/u/${LISTED}`, env);

    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('keeps a redirect on the way to a listed profile noindex', async () => {
    const response = await fetchAt(`/u/${LISTED}`);

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
