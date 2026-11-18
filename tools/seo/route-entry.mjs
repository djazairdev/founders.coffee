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

const markdownMarkers = /(?:^|\n)\s*(?:#{1,6}\s|[-*+]\s)|\*\*|__|~~|`/u;

const eventSchemaFailures = (path, body) => {
  const failures = [];
  const scripts = [
    ...body.matchAll(
      /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/giu,
    ),
  ];
  const schemas = [];
  for (const script of scripts) {
    try {
      const schema = JSON.parse(script[1]);
      if (schema && typeof schema === 'object' && schema['@type'] === 'Event')
        schemas.push(schema);
    } catch {
      failures.push('contains invalid JSON-LD');
    }
  }
  if (schemas.length !== 1)
    failures.push(`expected one Event JSON-LD object, got ${schemas.length}`);
  for (const schema of schemas) {
    for (const field of [
      'name',
      'startDate',
      'url',
      'location',
      'description',
    ]) {
      if (!schema[field]) failures.push(`Event JSON-LD is missing ${field}`);
    }
    if (
      typeof schema.description === 'string' &&
      markdownMarkers.test(schema.description)
    )
      failures.push('Event JSON-LD description contains raw Markdown');
  }

  const descriptionTag = body.match(
    /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/iu,
  )?.[0];
  const description = descriptionTag
    ? readAttribute(descriptionTag, 'content')
    : null;
  if (!description) failures.push('is missing a meta description');
  else if (markdownMarkers.test(description))
    failures.push('meta description contains raw Markdown');

  const kind = body.match(/\bdata-event-kind=["']([^"']+)["']/iu)?.[1];
  if (kind === 'hackathon') {
    const hasLocalizedHackathonTerm = [description, schemas[0]?.description]
      .filter((value) => typeof value === 'string')
      .some((value) => /hackathon|هاكاثون/iu.test(value));
    if (!hasLocalizedHackathonTerm)
      failures.push(
        'hackathon metadata does not identify the event as a hackathon',
      );
  }
  if (kind === 'workshop') {
    const hasLocalizedWorkshopTerm = [description, schemas[0]?.description]
      .filter((value) => typeof value === 'string')
      .some((value) => /workshop|atelier|ورشة/iu.test(value));
    if (!hasLocalizedWorkshopTerm)
      failures.push(
        'workshop metadata does not identify the event as a workshop',
      );
  }
  return failures;
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
  if (type === 'event')
    for (const failure of eventSchemaFailures(path, body))
      failures.push(`${path}: EVENT ${failure}`);
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
