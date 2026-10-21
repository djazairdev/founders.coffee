import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Topic } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import { event, market } from './EventDetail.fixtures';

const { EventDetail } = await import('./EventDetail');

const LABELS = {
  ar: 'المواضيع',
  fr: 'Thèmes',
  en: 'Topics',
} as const satisfies Record<Locale, string>;

const renderPage = (locale: Locale, tags: readonly Topic[]) =>
  render(
    <EventDetail
      locale={locale}
      market={market}
      event={{ ...event, tags: [...tags] }}
      host={null}
      isHost={false}
      live={null}
      isWindowOpen={false}
      phase="upcoming"
      mapboxToken={null}
    />,
  );

afterEach(cleanup);

describe('topics on the event page (B-EVT-07)', () => {
  it.each(['ar', 'fr', 'en'] as const)(
    'lists the event’s topics under their label in %s',
    (locale) => {
      renderPage(locale, ['design', 'investing']);

      const list = screen.getByRole('list', { name: LABELS[locale] });
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    },
  );

  it('names each topic in the reader’s language, in the host’s order', () => {
    renderPage('en', ['design', 'investing']);

    expect(
      within(screen.getByRole('list', { name: 'Topics' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Design', 'Investing']);
  });

  it('shows nothing for an event without topics', () => {
    renderPage('en', []);

    expect(screen.queryByRole('list', { name: 'Topics' })).toBeNull();
  });
});
