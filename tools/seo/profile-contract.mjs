import { privateRouteFailures } from './private-contract.mjs';

const PRODUCTION_ORIGIN = 'https://founders.coffee';
const NO_INDEX = 'noindex, nofollow';
const PRIVATE_CACHE = 'private, no-store';

const metaRobots = (body) =>
  /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["']([^"']+)["']/iu.exec(
    body,
  )?.[1] ?? null;

/** Whether a profile page says its member chose to be listed in search engines. */
export const isListedProfile = (body) => {
  const robots = metaRobots(body);
  return robots !== null && !robots.toLowerCase().includes('noindex');
};

/**
 * What a member's profile page must say, listed in search engines or not (B-PRF-04).
 *
 * A profile is never cached, so that turning the switch off takes effect on the next request. One
 * the sitemap lists is a public document, and the smoke holds it to the indexable contract as it
 * does a meetup; this adds only the cache. One it does not list is either a member who left the
 * switch off, which stays a private screen with no canonical, or, outside production, a listed
 * member whose page the environment still marks `noindex`. A production page that says it is
 * listed while the sitemap leaves it out has the two disagreeing.
 */
export const profileFailures = ({
  path,
  response,
  body,
  canonicalOrigin,
  isInSitemap,
}) => {
  const cacheControl = response.headers.get('cache-control');
  const failures =
    cacheControl === PRIVATE_CACHE
      ? []
      : [
          `${path}: a profile must stay ${PRIVATE_CACHE}, got ${cacheControl ?? 'missing'}`,
        ];
  if (isInSitemap) return failures;
  if (!isListedProfile(body))
    return privateRouteFailures({ path, response, body });
  if (canonicalOrigin === PRODUCTION_ORIGIN)
    return [
      ...failures,
      `${path}: a listed profile is missing from the sitemap`,
    ];
  const robots = response.headers.get('x-robots-tag');
  return robots === NO_INDEX
    ? failures
    : [
        ...failures,
        `${path}: expected ${NO_INDEX} outside production, got ${robots ?? 'missing'}`,
      ];
};
