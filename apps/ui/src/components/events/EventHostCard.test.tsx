import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventHostCard } from './EventHostCard';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params: { slug?: string };
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={`${to}#${params.slug ?? ''}`} className={className}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe('EventHostCard', () => {
  it('names the organisations that run the event, each linking to its page', () => {
    render(
      <EventHostCard
        locale="en"
        host={null}
        cityName="Algiers"
        isHost={false}
        organisations={[
          { name: 'Code Club Alger', slug: 'code-club' },
          { name: 'Souk Labs', slug: 'souk-labs' },
        ]}
      />,
    );

    expect(
      screen
        .getByRole('link', { name: 'Code Club Alger' })
        .getAttribute('href'),
    ).toContain('#code-club');
    expect(screen.getByRole('link', { name: 'Souk Labs' })).toBeTruthy();
  });

  it('lists none for an event a member runs alone', () => {
    render(
      <EventHostCard
        locale="en"
        host={null}
        cityName="Algiers"
        isHost={false}
      />,
    );

    expect(screen.queryByRole('list')).toBeNull();
  });
});
