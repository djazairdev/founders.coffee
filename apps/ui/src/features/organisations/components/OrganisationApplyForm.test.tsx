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
import { save, type Locale } from '@founders-coffee/i18n';

const mocks = vi.hoisted(() => ({ apply: vi.fn() }));

vi.mock('../api', () => ({ organisationsApi: { apply: mocks.apply } }));

const { OrganisationApplyForm } = await import('./OrganisationApplyForm');

afterEach(() => {
  cleanup();
  mocks.apply.mockReset();
});

const renderForm = (locale: Locale = 'en') => {
  const onSent = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OrganisationApplyForm locale={locale} onSent={onSent} />
    </QueryClientProvider>,
  );
  return { onSent };
};

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillValid = () => {
  type('Club, community or company name', 'Oran Makers');
  fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
  fireEvent.click(
    screen.getByRole('option', { name: 'Student or university club' }),
  );
  type(
    'Description',
    'Builders who meet every month in Oran to show their work.',
  );
};

const send = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('applying for an organisation (B-ORG-08)', () => {
  it.each<Locale>(['ar', 'en', 'fr'])(
    'offers a save action and only the organiser profile fields in %s',
    (locale) => {
      const { container } = render(
        <QueryClientProvider client={new QueryClient()}>
          <OrganisationApplyForm locale={locale} onSent={vi.fn()} />
        </QueryClientProvider>,
      );
      expect(screen.getAllByRole('textbox')).toHaveLength(3);
      expect(screen.getAllByRole('combobox')).toHaveLength(1);
      const expectedDirection = locale === 'ar' ? 'rtl' : 'ltr';
      expect(screen.getByRole('combobox').getAttribute('dir')).toBe(
        expectedDirection,
      );
      fireEvent.click(screen.getByRole('combobox'));
      for (const option of screen.getAllByRole('option')) {
        expect(option.getAttribute('dir')).toBe(expectedDirection);
      }
      for (const field of ['slug', 'market', 'state', 'city'])
        expect(container.querySelector(`#organisation-${field}`)).toBeNull();
      expect(
        screen
          .getByRole('button', { name: save({}, { locale }) })
          .querySelector('svg[aria-hidden="true"]'),
      ).toBeTruthy();
    },
  );

  it('takes the applicant to the first missing field instead of sending', () => {
    renderForm();
    send();

    expect(mocks.apply).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByLabelText('Club, community or company name'),
    );
    expect(
      screen
        .getByLabelText('Club, community or company name')
        .getAttribute('aria-invalid'),
    ).toBe('true');
    expect(screen.getByText('Give a name of 2 to 80 characters.')).toBeTruthy();
  });

  it('sends only the profile and uses the server-allocated address after a collision', async () => {
    mocks.apply.mockResolvedValue({
      name: 'Oran Makers',
      slug: 'oran-makers-12345678',
    });
    const { onSent } = renderForm();
    fillValid();
    send();

    await waitFor(() =>
      expect(onSent).toHaveBeenCalledWith({
        name: 'Oran Makers',
        slug: 'oran-makers-12345678',
      }),
    );
    expect(mocks.apply).toHaveBeenCalledWith({
      name: 'Oran Makers',
      kind: 'club',
      description: 'Builders who meet every month in Oran to show their work.',
      websiteUrl: null,
    });
  });

  it('says when hackathons are off, rather than failing', async () => {
    mocks.apply.mockRejectedValue(new AppError('hackathons_disabled', 'off'));
    renderForm();
    fillValid();
    send();

    expect(
      await screen.findByText('Hackathons aren’t open in this country yet.'),
    ).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('preserves the draft when saving is rate limited', async () => {
    mocks.apply.mockRejectedValue(new AppError('rate_limited', 'slow down'));
    renderForm();
    fillValid();
    send();

    expect(
      await screen.findByText(
        'You have sent several applications recently. Try again in an hour.',
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByLabelText(
          'Club, community or company name',
        ) as HTMLInputElement
      ).value,
    ).toBe('Oran Makers');
  });
});
