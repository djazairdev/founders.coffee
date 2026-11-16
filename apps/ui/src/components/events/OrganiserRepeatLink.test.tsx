import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganiserRepeatLink } from './OrganiserRepeatLink';

const mocks = vi.hoisted(() => ({
  organisations: undefined as unknown,
  template: null as unknown,
  templateEnabled: undefined as boolean | undefined,
}));

vi.mock('../../features/events/hooks', () => ({
  useRepeatEventTemplate: (_eventId: string, enabled: boolean) => {
    mocks.templateEnabled = enabled;
    return { data: enabled ? mocks.template : undefined };
  },
}));

vi.mock('../../features/organisations/hooks', () => ({
  useMyOrganisations: () => ({ data: mocks.organisations }),
}));

vi.mock('./RepeatHostLink', () => ({
  RepeatHostLink: ({ eventId }: { eventId: string }) => (
    <a href={`/repeat/${eventId}`}>Repeat</a>
  ),
}));

const show = () =>
  render(
    <OrganiserRepeatLink
      eventId="evt_past"
      cityCode="1"
      marketSlug="algeria"
      locale="en"
    />,
  );

beforeEach(() => {
  mocks.organisations = [{ id: 'org_lead' }];
  mocks.template = { sourceEventId: 'evt_past' };
  mocks.templateEnabled = undefined;
});

afterEach(cleanup);

describe('OrganiserRepeatLink (B-EVT-21)', () => {
  it('offers the repeat when the server gives this member its template', () => {
    show();

    expect(
      screen.getByRole('link', { name: 'Repeat' }).getAttribute('href'),
    ).toBe('/repeat/evt_past');
  });

  it('does not ask for a template for a member of no organisation', () => {
    mocks.organisations = [];
    show();

    expect(mocks.templateEnabled).toBe(false);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows nothing when the server refuses this member', () => {
    mocks.template = undefined;
    show();

    expect(screen.queryByRole('link')).toBeNull();
  });
});
