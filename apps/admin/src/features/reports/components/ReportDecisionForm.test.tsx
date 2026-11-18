import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportDecisionForm } from './ReportDecisionForm';

afterEach(() => cleanup());

const TEAM_ID = `tea_${'c'.repeat(32)}`;
const REASON = 'The code was copied from another team’s public repository.';

const renderForm = (
  canDisqualify = true,
  locale: 'en' | 'ar' | 'fr' = 'en',
) => {
  const onDecide = vi.fn();
  render(
    <ReportDecisionForm
      canDisqualify={canDisqualify}
      isDeciding={false}
      locale={locale}
      onDecide={onDecide}
      targetId={TEAM_ID}
      targetType="team"
    />,
  );
  return onDecide;
};

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('deciding on reports (B-SAFE-02)', () => {
  it('dismisses with nothing to fill in', () => {
    const onDecide = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onDecide).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: TEAM_ID, decision: 'dismiss' }),
    );
  });

  it('asks for a reason and evidence before disqualifying, and sends both', () => {
    const onDecide = renderForm();
    const disqualify = screen.getByRole('button', {
      name: 'Disqualify the team',
    });

    type('Reason the team is told', REASON);
    fireEvent.click(disqualify);
    expect(onDecide).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'To disqualify, give a reason of at least 10 characters and the evidence.',
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByLabelText('Reason the team is told'),
    );

    type('Evidence', 'https://github.com/other-team/ledger');
    fireEvent.click(disqualify);
    expect(onDecide).toHaveBeenCalledWith({
      targetType: 'team',
      targetId: TEAM_ID,
      decision: 'disqualify',
      reason: REASON,
      evidence: 'https://github.com/other-team/ledger',
    });
  });

  it('only dismisses reports about a team that has disbanded', () => {
    renderForm(false);

    expect(screen.queryByLabelText('Reason the team is told')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Disqualify the team' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
  });

  it('reads in Arabic and French', () => {
    renderForm(true, 'ar');
    expect(screen.getByRole('button', { name: 'استبعاد الفريق' })).toBeTruthy();
    cleanup();
    renderForm(true, 'fr');
    expect(
      screen.getByRole('button', { name: 'Classer sans suite' }),
    ).toBeTruthy();
  });
});
