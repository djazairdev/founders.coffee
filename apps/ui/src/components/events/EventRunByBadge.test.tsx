import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { EventRunBy } from '../../features/events/event-run-by';
import { event as cardEvent } from './EventCard.fixtures';
import { event as detailEvent, market } from './EventDetail.fixtures';

const { EventCard } = await import('./EventCard');
const { EventDetail } = await import('./EventDetail');

const LABELS = {
  ar: {
    platform: 'من تنظيم founders.coffee',
    co_hosted: 'تنظيم مشترك',
    community: 'مجتمعي',
  },
  fr: {
    platform: 'Organisé par founders.coffee',
    co_hosted: 'Co-organisé',
    community: 'Communautaire',
  },
  en: {
    platform: 'Hosted by founders.coffee',
    co_hosted: 'Co-hosted',
    community: 'Community',
  },
} as const satisfies Record<Locale, Record<EventRunBy['kind'], string>>;

const ORGANISED_BY = { ar: 'بتنظيم', fr: 'Organisé par', en: 'Organised by' };

const RUN_BY = {
  platform: { kind: 'platform' },
  co_hosted: {
    kind: 'co_hosted',
    organisations: [
      { name: 'Code Club Alger', slug: 'code-club-alger' },
      { name: 'GDG Algiers', slug: 'gdg-algiers' },
    ],
  },
  community: { kind: 'community' },
} as const satisfies Record<EventRunBy['kind'], EventRunBy>;

const CASES = (['ar', 'fr', 'en'] as const).flatMap((locale) =>
  (['platform', 'co_hosted', 'community'] as const).map(
    (kind) => [locale, kind] as const,
  ),
);

const renderCard = (locale: Locale, runBy: EventRunBy) =>
  render(
    <EventCard
      event={{ ...cardEvent, runBy }}
      locale={locale}
      timezone="Africa/Algiers"
      marketSlug="algeria"
    />,
  ).container;

const renderPage = (locale: Locale, runBy: EventRunBy) =>
  render(
    <EventDetail
      locale={locale}
      market={market}
      event={{ ...detailEvent, runBy }}
      host={null}
      isHost={false}
      live={null}
      isWindowOpen={false}
      phase="upcoming"
      mapboxToken={null}
    />,
  ).container;

const badges = (scope: Element | null) =>
  [...(scope?.querySelectorAll('.badge') ?? [])].map(
    (badge) => badge.textContent,
  );

const coHosts = (container: HTMLElement) =>
  [...container.querySelectorAll('p bdi')]
    .map((name) => name.textContent)
    .filter((name) => name === 'Code Club Alger' || name === 'GDG Algiers');

afterEach(cleanup);

describe('who runs each event (B-EVT-19)', () => {
  it.each(CASES)('labels a %s card: %s', (locale, kind) => {
    const container = renderCard(locale, RUN_BY[kind]);

    expect(badges(container)[1]).toBe(LABELS[locale][kind]);
  });

  it.each(CASES)('labels a %s event page: %s', (locale, kind) => {
    const container = renderPage(locale, RUN_BY[kind]);

    expect(badges(container.querySelector('header'))[1]).toBe(
      LABELS[locale][kind],
    );
  });

  it.each(['ar', 'fr', 'en'] as const)(
    'names every co-host, the lead first, on the %s card and page',
    (locale) => {
      for (const container of [
        renderCard(locale, RUN_BY.co_hosted),
        renderPage(locale, RUN_BY.co_hosted),
      ]) {
        expect(coHosts(container)).toEqual(['Code Club Alger', 'GDG Algiers']);
        expect(container.textContent).toContain(
          `${ORGANISED_BY[locale]} Code Club Alger`,
        );
      }
    },
  );

  it.each(['ar', 'fr', 'en'] as const)(
    'links each co-host to its page on the %s event page, not inside the card',
    (locale) => {
      const page = renderPage(locale, RUN_BY.co_hosted);
      const card = renderCard(locale, RUN_BY.co_hosted);

      expect(
        [...page.querySelectorAll('a')]
          .filter((link) => link.querySelector('bdi'))
          .map((link) => [link.textContent, link.getAttribute('href')]),
      ).toEqual([
        ['Code Club Alger', `/${locale}/o/code-club-alger`],
        ['GDG Algiers', `/${locale}/o/gdg-algiers`],
      ]);
      expect(card.querySelectorAll('a a')).toHaveLength(0);
      expect(
        [...card.querySelectorAll('a[href*="/o/"]')].map((link) =>
          link.getAttribute('href'),
        ),
      ).toEqual([]);
    },
  );

  it.each(['platform', 'community'] as const)(
    'names no organisation for a %s event',
    (kind) => {
      for (const container of [
        renderCard('en', RUN_BY[kind]),
        renderPage('en', RUN_BY[kind]),
      ]) {
        expect(container.textContent).not.toContain('Organised by');
      }
    },
  );
});
