import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OrganisationDecisionForm } from './OrganisationDecisionForm';

afterEach(() => cleanup());

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

const note = () => screen.getByLabelText('Note to the owner');

describe('deciding on an organisation (B-ORG-06)', () => {
  it('offers approve and reject on a pending application', () => {
    renderForm('pending');

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Suspend' })).toBeNull();
  });

  it('approves with no note', () => {
    const { onDecide } = renderForm('pending');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(onDecide).toHaveBeenCalledWith('approve', '');
  });

  it('takes the operator to the note instead of rejecting without one', () => {
    const { onDecide } = renderForm('pending');
    fireEvent.change(note(), { target: { value: 'Too short' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(onDecide).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(note());
    expect(note().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/at least 10 characters/)).toBeTruthy();
  });

  it('rejects with the note once it is long enough', () => {
    const { onDecide } = renderForm('pending');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(note(), {
      target: { value: 'Please link to your past events.' },
    });

    expect(note().getAttribute('aria-invalid')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(onDecide).toHaveBeenCalledWith(
      'reject',
      'Please link to your past events.',
    );
  });

  it('offers only suspend on an approved organisation, and only reinstate on a suspended one', () => {
    renderForm('approved');
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Suspend']);
    cleanup();

    renderForm('suspended');
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Reinstate']);
  });

  it('offers nothing on a rejected application', () => {
    const { view } = renderForm('rejected');

    expect(view.container.innerHTML).toBe('');
  });

  it('speaks the operator’s language', () => {
    renderForm('pending', 'ar');

    expect(screen.getByRole('button', { name: 'قبول' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'رفض' })).toBeTruthy();
  });
});
