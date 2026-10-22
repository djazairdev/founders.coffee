import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventCoHosts } from '../api';
import { EventCoHostCard } from './EventCoHostCard';

afterEach(() => cleanup());

const coHosts: EventCoHosts = {
  event: {
    id: 'evt_0123456789abcdef0123456789abcdef',
    title: 'Coffee and code',
    slug: 'coffee-and-code',
    marketCode: 'DZ',
    status: 'published',
    kind: 'meetup',
    startsAt: new Date('2026-11-01T17:00:00Z'),
  },
  organisers: [
    {
      organisationId: 'org_lead',
      name: 'Code Club Alger',
      slug: 'code-club-alger',
      kind: 'club',
      status: 'approved',
      role: 'lead',
    },
    {
      organisationId: 'org_gdg',
      name: 'GDG Algiers',
      slug: 'gdg-algiers',
      kind: 'community',
      status: 'suspended',
      role: 'co_host',
    },
  ],
  candidates: [
    {
      organisationId: 'org_makers',
      name: 'Oran Makers',
      slug: 'oran-makers',
      kind: 'club',
    },
    {
      organisationId: 'org_usthb',
      name: 'USTHB Robotics',
      slug: 'usthb-robotics',
      kind: 'university',
    },
  ],
};

const renderCard = (overrides: Partial<EventCoHosts> = {}) => {
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  render(
    <EventCoHostCard
      coHosts={{ ...coHosts, ...overrides }}
      isChanging={false}
      locale="en"
      onAdd={onAdd}
      onRemove={onRemove}
    />,
  );
  return { onAdd, onRemove };
};

describe("an event's co-hosts, for an operator (B-EVT-20)", () => {
  it('lists the organisers with their role, and a status other than approved', () => {
    renderCard();

    expect(
      screen.getByRole('heading', { name: 'Coffee and code' }),
    ).toBeTruthy();
    expect(screen.getByText('Lead')).toBeTruthy();
    expect(screen.getByText('Co-host · Suspended')).toBeTruthy();
  });

  it('offers to remove a co-host, never the lead', () => {
    const { onRemove } = renderCard();

    const remove = screen.getAllByRole('button', { name: 'Remove' });
    expect(remove).toHaveLength(1);
    fireEvent.click(remove[0] as HTMLElement);
    expect(onRemove).toHaveBeenCalledWith('org_gdg');
  });

  it('adds the organisation chosen, the first by default', () => {
    const { onAdd } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenLastCalledWith('org_makers');
    fireEvent.change(screen.getByLabelText('Add a co-host'), {
      target: { value: 'org_usthb' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenLastCalledWith('org_usthb');
  });

  it('says when nothing runs the event, and when nothing else can co-host it', () => {
    renderCard({ organisers: [], candidates: [] });

    expect(
      screen.getByText(
        'No organisation runs this event: it is a community event.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('No other approved organisation in this market.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
  });
});
