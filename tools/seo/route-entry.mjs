import { inspectGeoDocument } from './geo-contract.mjs';
import { documentHeaderFailures } from './header-contract.mjs';
import {
  defaultAlternateHref,
  soleAlternateLocale,
  withLocale,
} from './routes.mjs';

const HTML_CONTENT_TYPE = 'text/html';

const readAttribute = (tag, name) => {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'iu'));
  return match?.[1] ?? null;
};

/**
 * Check one public document against the indexable contract, pushing what it breaks onto `failures`,
 * and return its line in the report.
 */
export const routeEntry = (
  path,
  type,
  response,
  body,
  failures,
  canonicalOrigin,
) => {
  const contentType = response.headers.get('content-type') ?? '';
  const robots = response.headers.get('x-robots-tag');
  const cacheControl = response.headers.get('cache-control');
  const canonicalTags = [
    ...body.matchAll(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/giu),
  ];
  const canonical = canonicalTags[0]
    ? readAttribute(canonicalTags[0][0], 'href')
    : null;
  const documentLocale = soleAlternateLocale(body);
  const canonicalPath = documentLocale
    ? withLocale(path, documentLocale)
    : path;
  const expectedCanonical = new URL(
    canonicalPath,
    `${canonicalOrigin}/`,
  ).toString();
  if (response.status !== 200)
    failures.push(`${path}: expected 200, got ${response.status}`);
  if (!contentType.toLowerCase().includes(HTML_CONTENT_TYPE))
    failures.push(
      `${path}: expected HTML content type, got ${contentType || 'missing'}`,
    );
  if (canonicalTags.length !== 1)
    failures.push(
      `${path}: expected one canonical, got ${canonicalTags.length}`,
    );
  if (canonical !== expectedCanonical)
    failures.push(
      `${path}: canonical ${canonical ?? 'missing'} != ${expectedCanonical}`,
    );
  if (documentLocale) {
    const fallback = defaultAlternateHref(body);
    if (fallback !== expectedCanonical)
      failures.push(
        `${path}: single-language document sends x-default to ${fallback ?? 'nowhere'}, not ${expectedCanonical}`,
      );
  }
  for (const failure of inspectGeoDocument({
    path,
    type,
    body,
    canonical,
  }))
    failures.push(`${path}: GEO ${failure}`);
  failures.push(...documentHeaderFailures({ path, response, canonicalOrigin }));
  return {
    path,
    type,
    status: response.status,
    contentType,
    canonical,
    robots,
    cacheControl,
    hreflangCount: (body.match(/rel=["']alternate["']/giu) ?? []).length,
  };
};
