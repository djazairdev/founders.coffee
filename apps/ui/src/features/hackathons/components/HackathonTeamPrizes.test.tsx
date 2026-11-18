import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HackathonTeamPrizes } from './HackathonTeamPrizes';

afterEach(cleanup);

describe('HackathonTeamPrizes', () => {
  it('says whether each prize is pending or delivered', () => {
    render(
      <HackathonTeamPrizes
        prizes={[
          { prizeId: 'prz_1', title: 'First prize', isDelivered: false },
          { prizeId: 'prz_2', title: 'Best demo', isDelivered: true },
        ]}
        locale="en"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Your prizes' })).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
  });

  it('shows nothing to a team without a prize', () => {
    const { container } = render(
      <HackathonTeamPrizes prizes={[]} locale="ar" />,
    );

    expect(container.innerHTML).toBe('');
  });
});
