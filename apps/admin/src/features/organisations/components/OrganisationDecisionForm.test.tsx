import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OrganisationDecisionForm } from './OrganisationDecisionForm';

afterEach(cleanup);

const renderForm = (
  status: 'pending' | 'approved' | 'suspended' | 'rejected',
  locale: 'en' | 'ar' = 'en',
) => {
  const onDecide = vi.fn();
  const view = render(
    <OrganisationDecisionForm
      isDeciding={false}
      locale={locale}
      onDecide={onDecide}
      status={status}
    />,
  );
  return { onDecide, view };
};

describe('organisation moderation (B-ORG-06)', () => {
  it.each(['pending', 'rejected'] as const)(
    'offers no initial review action for legacy %s records',
    (status) => {
      const { view } = renderForm(status);
      expect(view.container.innerHTML).toBe('');
    },
  );

  it('suspends an active organiser and includes the optional note', () => {
    const { onDecide } = renderForm('approved');
    fireEvent.change(screen.getByLabelText('Note to the owner'), {
      target: { value: 'Reported for spam.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    expect(onDecide).toHaveBeenCalledWith('suspend', 'Reported for spam.');
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  it('reinstates a suspended organiser without a note', () => {
    const { onDecide } = renderForm('suspended');
    fireEvent.click(screen.getByRole('button', { name: 'Reinstate' }));
    expect(onDecide).toHaveBeenCalledWith('reinstate', '');
  });

  it('speaks Arabic', () => {
    renderForm('approved', 'ar');
    expect(screen.getByRole('button', { name: 'تعليق' })).toBeTruthy();
  });
});
