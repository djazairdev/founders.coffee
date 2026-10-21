import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import { event as cardEvent } from './EventCard.fixtures';
import { event as detailEvent, market } from './EventDetail.fixtures';

const { EventCard } = await import('./EventCard');
const { EventDetail } = await import('./EventDetail');

const NAMES = {
  ar: { meetup: 'لقاء', workshop: 'ورشة', hackathon: 'هاكاثون' },
  fr: { meetup: 'Rencontre', workshop: 'Atelier', hackathon: 'Hackathon' },
  en: { meetup: 'Meetup', workshop: 'Workshop', hackathon: 'Hackathon' },
} as const;

const KINDS = ['meetup', 'workshop', 'hackathon'] as const;
const CASES = (['ar', 'fr', 'en'] as const).flatMap((locale) =>
  KINDS.map((kind) => [locale, kind] as const),
);

const badgeIn = (container: HTMLElement) =>
  container.querySelector('.badge')?.textContent;

afterEach(cleanup);

describe('the event type badge (B-EVT-04)', () => {
  it.each(CASES)('names a %s card’s type: %s', (locale: Locale, kind) => {
    const { container } = render(
      <EventCard
        event={{ ...cardEvent, kind }}
        locale={locale}
        timezone="Africa/Algiers"
        marketSlug="algeria"
      />,
    );

    expect(badgeIn(container)).toBe(NAMES[locale][kind]);
  });

  it.each(CASES)('names the type on a %s event page: %s', (locale, kind) => {
    const { container } = render(
      <EventDetail
        locale={locale}
        market={market}
        event={{ ...detailEvent, kind }}
        host={null}
        isHost={false}
        live={null}
        isWindowOpen={false}
        phase="upcoming"
        mapboxToken={null}
      />,
    );

    const header = container.querySelector('header');
    expect(header?.querySelector('.badge')?.textContent).toBe(
      NAMES[locale][kind],
    );
  });
});
