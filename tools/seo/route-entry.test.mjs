import { describe, expect, it } from 'vitest';

import { routeEntry } from './route-entry.mjs';

const CANONICAL = 'https://founders.coffee/en/algeria/e/hackathon';
const WORKER_HEADERS = {
  'content-security-policy': "default-src 'self'",
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=()',
};

const eventDocument = ({ description, summary = description }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Hackathon',
    description,
    url: CANONICAL,
    startDate: '2026-12-01T09:00:00+01:00',
    location: { '@type': 'VirtualLocation' },
    inLanguage: 'en',
  };
  const body = `<html><head><link rel="canonical" href="${CANONICAL}"/><link rel="alternate" hreflang="en" href="${CANONICAL}"/><link rel="alternate" hreflang="x-default" href="${CANONICAL}"/><meta name="description" content="${summary}"/><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body><h1>Hackathon</h1><h2>Details</h2><span data-event-kind="hackathon">Hackathon</span></body></html>`;
  return {
    body,
    response: new Response(body, {
      headers: { ...WORKER_HEADERS, 'content-type': 'text/html' },
    }),
  };
};

const failuresFor = (document) => {
  const failures = [];
  routeEntry(
    '/en/algeria/e/hackathon',
    'event',
    document.response,
    document.body,
    failures,
    'https://founders.coffee',
  );
  return failures;
};

describe('event SEO smoke checks', () => {
  it('accepts localized hackathon metadata and valid Event JSON-LD', () => {
    expect(
      failuresFor(
        eventDocument({
          description: 'Hackathon details and registration.',
        }),
      ),
    ).toEqual([]);
  });

  it('rejects raw Markdown and meetup copy on a hackathon page', () => {
    const failures = failuresFor(
      eventDocument({
        description: '# Challenge **build a tool**',
        summary: 'A free Founders Coffee meetup.',
      }),
    );

    expect(failures).toContain(
      '/en/algeria/e/hackathon: EVENT Event JSON-LD description contains raw Markdown',
    );
    expect(failures).toContain(
      '/en/algeria/e/hackathon: EVENT hackathon metadata does not identify the event as a hackathon',
    );
  });
});
