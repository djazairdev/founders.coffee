import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HackathonScheduleStep } from './HackathonScheduleStep';

const ALGIERS = 'Africa/Algiers';

const renderStep = (
  props: Partial<Parameters<typeof HackathonScheduleStep>[0]> = {},
) => {
  const onChange = vi.fn();
  const onError = vi.fn();
  render(
    <HackathonScheduleStep
      locale="en"
      timeZone={ALGIERS}
      startsAt={null}
      endsAt={null}
      showValidation={false}
      onChange={onChange}
      onError={onError}
      {...props}
    />,
  );
  return { onChange, onError };
};

describe('HackathonScheduleStep', () => {
  afterEach(cleanup);

  it('shows localized saved dates and 24-hour times', () => {
    renderStep({
      startsAt: Date.UTC(2099, 2, 12, 8, 30),
      endsAt: Date.UTC(2099, 2, 14, 16, 0),
    });

    expect(
      screen.getByRole('button', { name: 'Start date March 12, 2099' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'End date March 14, 2099' }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText('Start time') as HTMLInputElement).value,
    ).toBe('09:30');
    expect((screen.getByLabelText('End time') as HTMLInputElement).value).toBe(
      '17:00',
    );
    expect(screen.getByText('March 12, 2099 – March 14, 2099')).toBeTruthy();
  });

  it('selects a date from the React Day Picker calendar', () => {
    const { onChange } = renderStep({
      startsAt: Date.UTC(2099, 2, 12, 8, 0),
      endsAt: Date.UTC(2099, 2, 14, 17, 0),
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Start date March 12, 2099' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /March 13th, 2099/ }));

    expect(
      screen.getByRole('button', { name: 'Start date March 13, 2099' }),
    ).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(
      Date.UTC(2099, 2, 13, 8, 0),
      Date.UTC(2099, 2, 14, 17, 0),
    );
  });

  it('reports a time that cannot be read and clears the schedule', () => {
    const { onChange, onError } = renderStep({
      startsAt: Date.UTC(2099, 2, 12, 8, 0),
      endsAt: Date.UTC(2099, 2, 14, 17, 0),
    });

    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenLastCalledWith(null, null);
    expect(onError).toHaveBeenLastCalledWith('invalid_wall_time');
  });

  it('shows required date validation after the organiser tries to continue', () => {
    renderStep({ showValidation: true });

    expect(
      screen.getByLabelText('Start date').getAttribute('aria-invalid'),
    ).toBe('true');
    expect(screen.getByLabelText('End date').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(screen.getAllByText('Choose a date to continue.')).toHaveLength(2);
  });

  it('opens the calendar by keyboard and returns focus after Escape', () => {
    renderStep({ showValidation: true });

    const dateButton = screen.getByLabelText('Start date');
    dateButton.focus();
    fireEvent.keyDown(dateButton, { key: 'Enter' });
    fireEvent.click(dateButton);

    const calendar = screen.getByRole('dialog', { name: 'Start date' });
    expect(calendar).toBeTruthy();
    fireEvent.keyDown(calendar, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Start date' })).toBeNull();
    expect(document.activeElement).toBe(dateButton);
  });

  it('shows invalid time feedback when the value is outside the 24-hour format', () => {
    renderStep({ showValidation: true });

    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '25:00' },
    });

    expect(
      screen.getByLabelText('Start time').getAttribute('aria-invalid'),
    ).toBe('true');
    expect(
      screen.getByText('Enter a valid 24-hour time, such as 09:00.', {
        selector: '#hackathon-kickoff-time-validation',
      }),
    ).toBeTruthy();
  });

  it('shows the message it is given', () => {
    renderStep({ error: 'That time has passed. Choose a future time.' });

    expect(
      screen.getByText('That time has passed. Choose a future time.'),
    ).toBeTruthy();
  });
});
