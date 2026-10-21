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

const PAGE = {
  ar: { group: 'النوع', meetup: 'لقاء', workshop: 'ورشة' },
  fr: { group: 'Type', meetup: 'Rencontre', workshop: 'Atelier' },
  en: { group: 'Type', meetup: 'Meetup', workshop: 'Workshop' },
} as const satisfies Record<
  Locale,
  { group: string; meetup: string; workshop: string }
>;

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

describe('choosing meetup or workshop (B-EVT-03)', () => {
  afterEach(resetHostCreateFixtures);

  it.each(['ar', 'fr', 'en'] as const)(
    'offers the two types on the details step, a meetup chosen, in %s',
    async (locale) => {
      renderHostCreateWizard(locale);
      await goToDetailsIn(locale);

      const group = screen.getByRole('group', { name: PAGE[locale].group });
      expect(group.tagName).toBe('FIELDSET');
      expect(option(new RegExp(`^${PAGE[locale].meetup}`)).checked).toBe(true);
      expect(option(new RegExp(`^${PAGE[locale].workshop}`)).checked).toBe(
        false,
      );
    },
  );

  it('publishes a meetup when the host leaves the choice alone', async () => {
    renderHostCreateWizard('en');
    await goToHostDetails();
    fillHostDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(hostCreateMocks.mutateAsync).toHaveBeenCalledOnce(),
    );
    expect(hostCreateMocks.mutateAsync).toHaveBeenCalledWith({
      data: { event: expect.objectContaining({ kind: 'meetup' }) },
    });
  });

  it('publishes a workshop the host chose, and keeps it through a step back', async () => {
    renderHostCreateWizard('en');
    await goToHostDetails();
    fireEvent.click(option(/^Workshop/));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(option(/^Workshop/).checked).toBe(true);
    fillHostDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(hostCreateMocks.mutateAsync).toHaveBeenCalledOnce(),
    );
    expect(hostCreateMocks.mutateAsync).toHaveBeenCalledWith({
      data: { event: expect.objectContaining({ kind: 'workshop' }) },
    });
  });
});
