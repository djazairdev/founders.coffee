import { describe, expect, it } from 'vitest';

import { runWithContext } from '@founders-coffee/observability/context';

import { eventPageHead } from './seo-event';

const eventHead = (input: {
  locale?: 'ar' | 'en' | 'fr';
  kind: 'hackathon' | 'workshop';
  status?: 'cancelled' | 'published';
  description?: string;
}) => {
  const locale = input.locale ?? 'fr';
  return runWithContext({ siteOrigin: 'https://founders.coffee' }, () =>
    eventPageHead({
      locale,
      marketCode: 'DZ',
      eventId: 'evt_cafe0000000000000000000000000f',
      version: 1,
      title: 'Événement de test',
      kind: input.kind,
      cityName: 'Alger',
      description: input.description,
      route: {
        type: 'event',
        market: 'algeria',
        slug: 'event-test',
        locale,
      },
      structuredEvent: {
        title: 'Événement de test',
        description: input.description ?? '',
        startsAt: new Date('2026-09-20T10:00:00Z'),
        endsAt: null,
        createdAt: new Date('2026-09-01T08:30:00Z'),
        timezone: 'Africa/Algiers',
        status: input.status ?? 'published',
        format: 'in_person',
        venue: 'Café Atlas',
        cityName: 'Alger',
        regionName: 'Alger',
        venueAddress: null,
        latitude: null,
        longitude: null,
        marketCode: 'DZ',
        languages: [locale],
        url: `https://founders.coffee/${locale}/algeria/e/event-test`,
        currency: 'DZD',
        organizer: null,
      },
      breadcrumbs: [],
    }),
  );
};

const description = (head: ReturnType<typeof eventHead>) =>
  head.meta.find((item) => 'name' in item && item.name === 'description')
    ?.content ?? '';

const eventSchema = (head: ReturnType<typeof eventHead>) =>
  JSON.parse(head.scripts[0]?.children ?? '{}');

describe('event-kind metadata', () => {
  it('identifies hackathons and removes Markdown syntax from descriptions', () => {
    const head = eventHead({
      kind: 'hackathon',
      description: '# À propos\n\n- **Former des équipes**\n- Livrer un projet',
    });
    const metaDescription = description(head);
    const schemaDescription = eventSchema(head).description as string;

    expect(metaDescription).toContain('hackathon');
    expect(metaDescription).toContain('Former des équipes');
    expect(metaDescription).not.toMatch(/(^|\n)\s*#|\*\*|`/u);
    expect(schemaDescription).toContain('Former des équipes');
    expect(schemaDescription).not.toMatch(/(^|\n)\s*#|\*\*|`/u);
  });

  it('keeps code samples and tables out of hackathon metadata', () => {
    const head = eventHead({
      kind: 'hackathon',
      description: [
        '# Challenge',
        '',
        '```ts',
        'throw new Error("source must not be metadata");',
        '```',
        '',
        'Track | Focus',
        '--- | ---',
        'Open source | Local tools',
        '',
        'Build a helpful tool for local teams before the final showcase.',
      ].join('\n'),
    });
    const metaDescription = description(head);
    const schemaDescription = eventSchema(head).description as string;

    expect(metaDescription).not.toContain('throw new Error');
    expect(metaDescription).not.toContain('Track | Focus');
    expect(metaDescription).not.toContain('source must not be metadata');
    expect(schemaDescription).toContain('Build a helpful tool');
    expect(schemaDescription).not.toContain('throw new Error');
    expect(schemaDescription).not.toContain('Track | Focus');
  });

  it('describes workshops separately from meetups', () => {
    expect(description(eventHead({ kind: 'workshop' }))).toContain('atelier');
  });

  it('keeps cancelled hackathon metadata specific to the event type', () => {
    const head = eventHead({
      locale: 'ar',
      kind: 'hackathon',
      status: 'cancelled',
    });

    expect(description(head)).toContain('أُلغي الهاكاثون');
  });
});
