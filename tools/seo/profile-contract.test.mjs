import { describe, expect, it } from 'vitest';

import { isListedProfile, profileFailures } from './profile-contract.mjs';

const PRODUCTION = 'https://founders.coffee';
const STAGING = 'https://staging.founders.coffee';
const PATH = '/fr/u/usr_1';

const page = ({ robots, canonical = null }) =>
  `<html><head><meta name="robots" content="${robots}"/>${
    canonical ? `<link rel="canonical" href="${canonical}"/>` : ''
  }</head><body><h1>Amina</h1></body></html>`;

const listed = page({
  robots: 'index,follow',
  canonical: `${PRODUCTION}${PATH}`,
});
const unlisted = page({ robots: 'noindex, nofollow' });

const answer = (headers, status = 200) =>
  new Response(null, { status, headers });

const check = ({ body, headers, canonicalOrigin = PRODUCTION, isInSitemap }) =>
  profileFailures({
    path: PATH,
    response: answer(headers),
    body,
    canonicalOrigin,
    isInSitemap,
  });

describe('a profile page in the smoke (B-PRF-04)', () => {
  it('reads the member’s choice off the page', () => {
    expect(isListedProfile(listed)).toBe(true);
    expect(isListedProfile(unlisted)).toBe(false);
    expect(isListedProfile('<html></html>')).toBe(false);
  });

  it('accepts a listed profile the sitemap lists, while it is never cached', () => {
    const headers = {
      'cache-control': 'private, no-store',
      'x-robots-tag': 'index, follow',
    };
    expect(check({ body: listed, headers, isInSitemap: true })).toEqual([]);
    expect(
      check({
        body: listed,
        headers: { ...headers, 'cache-control': 'public, max-age=60' },
        isInSitemap: true,
      }),
    ).toEqual([
      `${PATH}: a profile must stay private, no-store, got public, max-age=60`,
    ]);
  });

  it('holds a profile its member left unlisted to the private contract', () => {
    const headers = {
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    };
    expect(check({ body: unlisted, headers, isInSitemap: false })).toEqual([]);
    expect(
      check({
        body: page({
          robots: 'noindex, nofollow',
          canonical: `${PRODUCTION}${PATH}`,
        }),
        headers,
        isInSitemap: false,
      }),
    ).toEqual([`${PATH}: utility page must not emit a canonical`]);
    expect(
      check({
        body: unlisted,
        headers: { 'cache-control': 'private, no-store' },
        isInSitemap: false,
      }),
    ).toEqual([
      `${PATH}: expected noindex, nofollow response header, got missing`,
    ]);
  });

  it('fails a production profile that says it is listed while the sitemap leaves it out', () => {
    expect(
      check({
        body: listed,
        headers: {
          'cache-control': 'private, no-store',
          'x-robots-tag': 'index, follow',
        },
        isInSitemap: false,
      }),
    ).toEqual([`${PATH}: a listed profile is missing from the sitemap`]);
  });

  it('wants a listed profile noindex outside production, where nothing is listed', () => {
    expect(
      check({
        body: listed,
        headers: {
          'cache-control': 'private, no-store',
          'x-robots-tag': 'noindex, nofollow',
        },
        canonicalOrigin: STAGING,
        isInSitemap: false,
      }),
    ).toEqual([]);
    expect(
      check({
        body: listed,
        headers: {
          'cache-control': 'private, no-store',
          'x-robots-tag': 'index, follow',
        },
        canonicalOrigin: STAGING,
        isInSitemap: false,
      }),
    ).toEqual([
      `${PATH}: expected noindex, nofollow outside production, got index, follow`,
    ]);
  });
});
