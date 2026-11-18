import { describe, expect, it } from 'vitest';

import { LOCALES } from '@founders-coffee/i18n';

import {
  INDEX_VALUE,
  NO_INDEX_VALUE,
  PRIVATE_DOCUMENT_CACHE_CONTROL,
  withPrivateRouteHeaders,
} from './indexation';

const floorAt = (
  pathname: string,
  status: number,
  robots: string | null,
): (string | null)[] => {
  const headers = new Headers({ 'content-type': 'text/html' });
  if (robots) headers.set('X-Robots-Tag', robots);
  if (status >= 300 && status < 400) headers.set('location', '/elsewhere');
  const response = withPrivateRouteHeaders(
    new Response(status === 200 || status === 404 ? '<html />' : null, {
      status,
      headers,
    }),
    pathname,
  );
  return [
    response.headers.get('cache-control'),
    response.headers.get('x-robots-tag'),
  ];
};

describe('the floor under a profile page (B-PRF-04)', () => {
  it.each(LOCALES)(
    'keeps the decision of a profile page its route rendered, in %s, and still never caches it',
    (locale) => {
      expect(floorAt(`/${locale}/u/usr_1`, 200, INDEX_VALUE)).toEqual([
        PRIVATE_DOCUMENT_CACHE_CONTROL,
        INDEX_VALUE,
      ]);
      expect(floorAt(`/${locale}/u/usr_1`, 200, NO_INDEX_VALUE)).toEqual([
        PRIVATE_DOCUMENT_CACHE_CONTROL,
        NO_INDEX_VALUE,
      ]);
    },
  );

  it.each([
    ['a page that says nothing', '/en/u/usr_1', 200, null],
    ['a redirect', '/en/u/usr_1', 307, INDEX_VALUE],
    ['a member who cannot be shown', '/en/u/usr_1', 404, INDEX_VALUE],
    ['the bare address', '/u/usr_1', 200, INDEX_VALUE],
    ['an address the layout redirects', '/algeria/u/usr_1', 307, INDEX_VALUE],
    ['an address deeper than a profile', '/en/u/usr_1/more', 200, INDEX_VALUE],
  ])('answers %s noindex whatever it carries', (_, path, status, robots) => {
    expect(floorAt(path, status, robots)).toEqual([
      PRIVATE_DOCUMENT_CACHE_CONTROL,
      NO_INDEX_VALUE,
    ]);
  });

  it('keeps the floor on every other private screen, even one that claims to be indexable', () => {
    expect(floorAt('/en/profile', 200, INDEX_VALUE)).toEqual([
      PRIVATE_DOCUMENT_CACHE_CONTROL,
      NO_INDEX_VALUE,
    ]);
  });
});
