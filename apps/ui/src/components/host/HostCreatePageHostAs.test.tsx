import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { host_next, type Locale } from '@founders-coffee/i18n';

import {
  getHostCreateMocks,
  renderHostCreateWizard,
  resetHostCreateFixtures,
} from './HostCreatePage.fixtures';
import {
  fillHostDetails,
  goToHostDetails,
} from './HostCreatePage.flows.fixtures';

const hostCreateMocks = getHostCreateMocks();

const organisation = (overrides: Record<string, unknown> = {}) => ({
  id: 'org_codeclub',
  name: 'Code Club Alger',
  slug: 'code-club-alger',
  kind: 'club',
  status: 'approved',
  marketCode: 'DZ',
  cityCode: null,
  description: 'Weekly coding evenings.',
  websiteUrl: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  role: 'owner',
  ...overrides,
});

const PAGE = {
  ar: { group: 'التنظيم باسم', myself: 'باسمي' },
  fr: { group: 'Organiser en tant que', myself: 'Moi-même' },
  en: { group: 'Host as', myself: 'Myself' },
} as const satisfies Record<Locale, { group: string; myself: string }>;

const option = (name: RegExp | string) =>
  screen.getByRole<HTMLInputElement>('radio', { name });

const goToDetailsIn = async (locale: Locale) => {
  const next = () =>
    fireEvent.click(
      screen.getByRole('button', { name: host_next({}, { locale }) }),
    );
  fireEvent.click(await screen.findByRole('button', { name: 'Choose venue' }));
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Set schedule' }));
  next();
};

const publish = () => {
  fillHostDetails();
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
};

describe('hosting an event as an organisation (B-EVT-18)', () => {
  afterEach(resetHostCreateFixtures);

  it.each(['ar', 'fr', 'en'] as const)(
    'offers myself or each approved organisation, myself chosen, in %s',
    async (locale) => {
      hostCreateMocks.myOrganisations = [organisation()];
      renderHostCreateWizard(locale);
      await goToDetailsIn(locale);

      const group = screen.getByRole('group', { name: PAGE[locale].group });
      expect(group.tagName).toBe('FIELDSET');
      expect(option(new RegExp(`^${PAGE[locale].myself}`)).checked).toBe(true);
      expect(option(/^Code Club Alger/).checked).toBe(false);
    },
  );

  it('asks nothing of a member in no approved organisation of this market', async () => {
    hostCreateMocks.myOrganisations = [
      organisation({ status: 'pending' }),
      organisation({ id: 'org_cairo', marketCode: 'EG', name: 'Cairo Club' }),
    ];
    renderHostCreateWizard('en');
    await goToHostDetails();

    expect(screen.queryByRole('group', { name: 'Host as' })).toBeNull();
    publish();
    await waitFor(() =>
      expect(hostCreateMocks.mutateAsync).toHaveBeenCalledOnce(),
    );
    expect(hostCreateMocks.organisationMutateAsync).not.toHaveBeenCalled();
  });

  it('publishes as the member when they leave the choice alone', async () => {
    hostCreateMocks.myOrganisations = [organisation()];
    renderHostCreateWizard('en');
    await goToHostDetails();
    publish();

    await waitFor(() =>
      expect(hostCreateMocks.mutateAsync).toHaveBeenCalledOnce(),
    );
    expect(hostCreateMocks.organisationMutateAsync).not.toHaveBeenCalled();
  });

  it('publishes as the organisation chosen, and keeps the choice through a step back', async () => {
    hostCreateMocks.myOrganisations = [organisation()];
    renderHostCreateWizard('en');
    await goToHostDetails();
    fireEvent.click(option(/^Code Club Alger/));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(option(/^Code Club Alger/).checked).toBe(true);
    publish();

    await waitFor(() =>
      expect(hostCreateMocks.organisationMutateAsync).toHaveBeenCalledOnce(),
    );
    expect(hostCreateMocks.organisationMutateAsync).toHaveBeenCalledWith({
      data: {
        organisationId: 'org_codeclub',
        event: expect.objectContaining({ title: expect.any(String) }),
      },
    });
    expect(hostCreateMocks.mutateAsync).not.toHaveBeenCalled();
  });
});
