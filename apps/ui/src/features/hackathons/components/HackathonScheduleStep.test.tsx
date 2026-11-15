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

  it('opens with the saved start and end dates and times', () => {
    renderStep({
      startsAt: Date.UTC(2099, 2, 12, 8, 30),
      endsAt: Date.UTC(2099, 2, 14, 16, 0),
    });

    expect(
      (screen.getByLabelText('Start date') as HTMLInputElement).value,
    ).toBe('2099-03-12');
    expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe(
      '2099-03-14',
    );
    expect(
      (screen.getByLabelText('Start time') as HTMLInputElement).value,
    ).toBe('09:30');
    expect((screen.getByLabelText('End time') as HTMLInputElement).value).toBe(
      '17:00',
    );
    expect(screen.getByText('March 12, 2099 – March 14, 2099')).toBeTruthy();
  });

  it('sets the schedule from separate start and end date fields', () => {
    const { onChange } = renderStep();
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2099-03-12' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2099-03-14' },
    });

    const [startsAt, endsAt] = onChange.mock.lastCall ?? [];
    expect(endsAt - startsAt).toBe(2 * 86_400_000 + 9 * 3_600_000);
  });

  it('selects a date from the React Day Picker calendar', () => {
    const { onChange } = renderStep({
      startsAt: Date.UTC(2099, 2, 12, 8, 0),
      endsAt: Date.UTC(2099, 2, 14, 17, 0),
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Open calendar: Start date' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /March 13th, 2099/ }));

    expect(
      (screen.getByLabelText('Start date') as HTMLInputElement).value,
    ).toBe('2099-03-13');
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

  it('shows date-format feedback for a value that is not a calendar date', () => {
    renderStep({ showValidation: true });

    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-02-31' },
    });

    expect(
      screen.getByLabelText('Start date').getAttribute('aria-invalid'),
    ).toBe('true');
    expect(
      screen.getByText('Enter a valid date in YYYY-MM-DD format.'),
    ).toBeTruthy();
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
