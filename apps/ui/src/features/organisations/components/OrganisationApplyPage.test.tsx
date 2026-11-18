import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  hackathon_create,
  org_apply_description,
  org_apply_kind,
  org_apply_name,
  org_apply_sent,
  organisation_kind_club,
  save,
  type Locale,
} from '@founders-coffee/i18n';

const mocks = vi.hoisted(() => ({ apply: vi.fn() }));
vi.mock('../api', () => ({ organisationsApi: { apply: mocks.apply } }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => (
    <a
      className={className}
      href={to.replace(
        /\$([a-z]+)/gu,
        (_match, key: string) => params[key] ?? '',
      )}
    >
      {children}
    </a>
  ),
}));

const { OrganisationApplyPage } = await import('./OrganisationApplyPage');

afterEach(() => {
  cleanup();
  mocks.apply.mockReset();
});

describe('immediate organiser registration (B-ORG-08)', () => {
  it.each<Locale>(['ar', 'en', 'fr'])(
    'offers hackathon creation after saving in %s',
    async (locale) => {
      const options = { locale };
      mocks.apply.mockResolvedValue({
        name: 'New Club',
        slug: 'new-club-12345678',
        status: 'approved',
      });
      render(
        <QueryClientProvider client={new QueryClient()}>
          <OrganisationApplyPage locale={locale} />
        </QueryClientProvider>,
      );
      fireEvent.change(screen.getByLabelText(org_apply_name({}, options)), {
        target: { value: 'New Club' },
      });
      fireEvent.click(
        screen.getByRole('combobox', { name: org_apply_kind({}, options) }),
      );
      fireEvent.click(
        screen.getByRole('option', {
          name: organisation_kind_club({}, options),
        }),
      );
      fireEvent.change(
        screen.getByLabelText(org_apply_description({}, options)),
        {
          target: {
            value: 'A student club that builds practical projects together.',
          },
        },
      );
      fireEvent.click(screen.getByRole('button', { name: save({}, options) }));
      const create = await screen.findByRole('link', {
        name: hackathon_create({}, options),
      });
      expect(create.getAttribute('href')).toBe(
        `/${locale}/o/new-club-12345678/hackathons/new`,
      );
      expect(
        screen.getByText(org_apply_sent({ name: 'New Club' }, options)),
      ).toBeTruthy();
    },
  );
});
