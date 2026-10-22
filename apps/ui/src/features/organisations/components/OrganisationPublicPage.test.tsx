import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { event } from '../../../components/events/EventCard.fixtures';
import type { RootMarket } from '../../markets/api';
import type { OrganisationPage } from '../api';

const { OrganisationPublicPage } = await import('./OrganisationPublicPage');

const markets: readonly RootMarket[] = [
  {
    code: 'DZ',
    slug: 'algeria',
    name: 'Algeria',
    nameAr: 'الجزائر',
    nameFr: 'Algérie',
    timezone: 'Africa/Algiers',
  },
];

const page: OrganisationPage = {
  organisation: {
    id: 'org_code_club',
    name: 'Code Club',
    slug: 'code-club',
    kind: 'club',
    description: 'Weekly coding evenings for students in Algiers.',
    websiteUrl: 'https://codeclub.example.org',
    marketCode: 'DZ',
    cityCode: null,
  },
  upcoming: [
    { ...event, id: 'evt_next', slug: 'next-evening', title: 'Next evening' },
    {
      ...event,
      id: 'evt_hidden',
      slug: 'hidden-market',
      title: 'Somewhere hidden',
      marketCode: 'EG',
    },
  ],
  past: [],
};

const TEXT = {
  ar: {
    kind: 'نادي',
    upcoming: 'الفعاليات القادمة',
    past: 'الفعاليات السابقة',
    noPast: 'لا توجد فعاليات سابقة بعد.',
    website: 'الموقع الإلكتروني',
  },
  fr: {
    kind: 'Club',
    upcoming: 'Événements à venir',
    past: 'Événements passés',
    noPast: 'Aucun événement passé pour l’instant.',
    website: 'Site web',
  },
  en: {
    kind: 'Club',
    upcoming: 'Upcoming events',
    past: 'Past events',
    noPast: 'No past events yet.',
    website: 'Website',
  },
} as const;

afterEach(cleanup);

describe("an organisation's public page (B-ORG-11)", () => {
  it.each(['ar', 'fr', 'en'] as const)(
    'shows the name, kind, description and website in %s',
    (locale) => {
      render(
        <OrganisationPublicPage
          locale={locale}
          page={page}
          markets={markets}
        />,
      );

      expect(
        screen.getByRole('heading', { level: 1, name: 'Code Club' }),
      ).toBeTruthy();
      expect(screen.getByText(TEXT[locale].kind)).toBeTruthy();
      expect(
        screen.getByText('Weekly coding evenings for students in Algiers.'),
      ).toBeTruthy();
      const website = screen.getByRole('link', {
        name: `${TEXT[locale].website}: https://codeclub.example.org`,
      });
      expect(website.getAttribute('href')).toBe('https://codeclub.example.org');
      expect(website.getAttribute('rel')).toBe(
        'noopener noreferrer nofollow ugc',
      );
    },
  );

  it.each(['ar', 'fr', 'en'] as const)(
    'lists upcoming events in a market visitors can see, and says when there are none, in %s',
    (locale) => {
      render(
        <OrganisationPublicPage
          locale={locale}
          page={page}
          markets={markets}
        />,
      );

      const upcoming = screen
        .getByRole('heading', { level: 2, name: TEXT[locale].upcoming })
        .closest('section');
      const past = screen
        .getByRole('heading', { level: 2, name: TEXT[locale].past })
        .closest('section');
      if (!upcoming || !past) throw new Error('no event sections');

      expect(within(upcoming).getByText('Next evening')).toBeTruthy();
      expect(within(upcoming).queryByText('Somewhere hidden')).toBeNull();
      expect(
        within(upcoming)
          .getAllByRole('link')
          .map((link) => link.getAttribute('href')),
      ).toContain(`/${locale}/algeria/e/next-evening`);
      expect(within(past).getByText(TEXT[locale].noPast)).toBeTruthy();
    },
  );

  it('names the platform as a platform, and leaves out a website it does not have', () => {
    render(
      <OrganisationPublicPage
        locale="en"
        page={{
          ...page,
          organisation: {
            ...page.organisation,
            name: 'founders.coffee',
            kind: 'platform',
            websiteUrl: null,
          },
        }}
        markets={markets}
      />,
    );

    expect(screen.getByText('Platform')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Website/u })).toBeNull();
  });
});
