import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HackathonDecisionForm } from './HackathonDecisionForm';

afterEach(() => cleanup());

const EVENT_ID = `evt_${'b'.repeat(32)}`;

const renderForm = (locale: 'en' | 'ar' = 'en') => {
  const onDecide = vi.fn();
  render(
    <HackathonDecisionForm
      eventId={EVENT_ID}
      isDeciding={false}
      locale={locale}
      onDecide={onDecide}
    />,
  );
  return onDecide;
};

const note = () => screen.getByLabelText('Note to the organisers');

describe('deciding on a hackathon (B-HKN-08)', () => {
  it('approves and publishes with no note', () => {
    const onDecide = renderForm();

    fireEvent.click(
      screen.getByRole('button', { name: 'Approve and publish' }),
    );

    expect(onDecide).toHaveBeenCalledWith('approve', '');
  });

  it('takes the operator to the note instead of rejecting without one', () => {
    const onDecide = renderForm();
    fireEvent.change(note(), { target: { value: 'Too short' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(onDecide).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(note());
    expect(note().getAttribute('aria-invalid')).toBe('true');
    expect(
      screen.getByText('Write a note of at least 10 characters to reject.'),
    ).toBeTruthy();
  });

  it('rejects with a note the organisers can act on', () => {
    const onDecide = renderForm();
    fireEvent.change(note(), {
      target: { value: 'Name who judges, and how.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(onDecide).toHaveBeenCalledWith(
      'reject',
      'Name who judges, and how.',
    );
  });

  it('reads in Arabic', () => {
    renderForm('ar');

    expect(
      screen.getByRole('button', { name: 'الموافقة والنشر' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('ملاحظة للمنظمين')).toBeTruthy();
  });
});
