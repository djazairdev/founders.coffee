import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

const mocks = vi.hoisted(() => ({ apply: vi.fn() }));

vi.mock('../api', () => ({ organisationsApi: { apply: mocks.apply } }));

vi.mock('../../geo/hooks', () => ({
  useMarketStates: () => ({
    data: [{ code: '31', name: 'Oran', nameAr: 'وهران', nameFr: 'Oran' }],
  }),
  useStateCities: (_market: string, state: string) => ({
    data: state
      ? [
          {
            code: '3101',
            name: 'Oran',
            nameAr: 'وهران',
            nameFr: 'Oran',
            slug: 'oran',
            stateCode: '31',
            featured: true,
          },
        ]
      : undefined,
  }),
}));

const { OrganisationApplyForm } = await import('./OrganisationApplyForm');

const markets = [
  {
    code: 'DZ',
    slug: 'algeria',
    name: 'Algeria',
    nameAr: 'الجزائر',
    nameFr: 'Algérie',
    timezone: 'Africa/Algiers',
  },
];

afterEach(() => {
  cleanup();
  mocks.apply.mockReset();
});

const renderForm = (locale: Locale = 'en') => {
  const onSent = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OrganisationApplyForm
        defaultMarketCode="DZ"
        locale={locale}
        markets={markets}
        onSent={onSent}
      />
    </QueryClientProvider>,
  );
  return { onSent };
};

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillValid = () => {
  type('Name', 'Oran Makers');
  fireEvent.change(screen.getByLabelText('Type'), {
    target: { value: 'club' },
  });
  type(
    'Description',
    'Builders who meet every month in Oran to show their work.',
  );
};

const send = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Send the application' }));

describe('applying for an organisation (B-ORG-08)', () => {
  it('takes the applicant to the first missing field instead of sending', () => {
    renderForm();

    send();

    expect(mocks.apply).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
    expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(screen.getByText('Give a name of 2 to 80 characters.')).toBeTruthy();
  });

  it('offers the address from the name', () => {
    renderForm();

    type('Name', 'École 42 Alger');

    expect(
      (screen.getByLabelText('Page address') as HTMLInputElement).value,
    ).toBe('ecole-42-alger');
  });

  it('sends the application with the chosen city, and reports it sent', async () => {
    mocks.apply.mockResolvedValue({ organisationId: 'org_1' });
    const { onSent } = renderForm();
    fillValid();
    fireEvent.change(screen.getByLabelText(/Region/), {
      target: { value: '31' },
    });
    fireEvent.change(screen.getByLabelText(/City/), {
      target: { value: '3101' },
    });

    send();

    await waitFor(() => expect(onSent).toHaveBeenCalledWith('Oran Makers'));
    expect(mocks.apply).toHaveBeenCalledWith({
      name: 'Oran Makers',
      slug: 'oran-makers',
      kind: 'club',
      marketCode: 'DZ',
      cityCode: '3101',
      description: 'Builders who meet every month in Oran to show their work.',
      websiteUrl: null,
    });
  });

  it('sends the applicant back to the address when another organisation has it', async () => {
    mocks.apply.mockRejectedValue(
      new AppError('organisation_slug_taken', 'taken'),
    );
    renderForm();
    fillValid();

    send();

    expect(
      await screen.findByText(
        'Another organisation has this address. Choose another.',
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Page address'));
  });

  it('says when the country has hackathons off, rather than failing', async () => {
    mocks.apply.mockRejectedValue(new AppError('hackathons_disabled', 'off'));
    renderForm();
    fillValid();

    send();

    expect(
      await screen.findByText('Hackathons aren’t open in this country yet.'),
    ).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains a refusal it cannot place on a field', async () => {
    mocks.apply.mockRejectedValue(new AppError('rate_limited', 'slow down'));
    renderForm();
    fillValid();

    send();

    expect(
      await screen.findByText(
        'You have sent several applications recently. Try again in an hour.',
      ),
    ).toBeTruthy();
  });

  it('speaks Arabic, with the country named in Arabic', () => {
    renderForm('ar');

    expect(screen.getByRole('button', { name: 'إرسال الطلب' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'الجزائر' })).toBeTruthy();
  });
});
