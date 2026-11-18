import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HackathonTeamFeedback } from './HackathonTeamFeedback';

const SCORE = {
  criterionId: 'cri_impact',
  name: 'Impact',
  scale: 10,
  value: 8,
  comment: 'A shop could use this tomorrow.',
};

afterEach(cleanup);

describe('HackathonTeamFeedback', () => {
  it('shows each judge by number, with their scores and comments', () => {
    render(
      <HackathonTeamFeedback
        locale="en"
        feedback={{
          title: 'Ledger',
          judges: [
            { number: 1, scores: [SCORE] },
            {
              number: 2,
              scores: [{ ...SCORE, value: 6, comment: null }],
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Judge 1', level: 3 }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Judge 2', level: 3 }),
    ).toBeTruthy();
    expect(screen.getByText('A shop could use this tomorrow.')).toBeTruthy();
    expect(screen.getByText(/Only your team can read this/u)).toBeTruthy();
    expect(screen.getByText('Ledger')).toBeTruthy();
  });

  it('says so when no judge scored the project', () => {
    render(
      <HackathonTeamFeedback
        locale="ar"
        feedback={{ title: 'Ledger', judges: [] }}
      />,
    );

    expect(screen.getByText('لم يمنح أي حكم علامة لمشروع فريقك.')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
