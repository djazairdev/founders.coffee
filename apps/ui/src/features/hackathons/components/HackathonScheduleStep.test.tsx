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
      onChange={onChange}
      onError={onError}
      {...props}
    />,
  );
  return { onChange, onError };
};

const futureMonthDay = (day: number) => {
  const next = new Date();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  next.setDate(day);
  return next;
};

describe('HackathonScheduleStep', () => {
  afterEach(cleanup);

  it('opens on the saved kickoff and demo day', () => {
    renderStep({
      startsAt: Date.UTC(2099, 2, 12, 8, 30),
      endsAt: Date.UTC(2099, 2, 14, 16, 0),
    });

    expect(
      (screen.getByLabelText('Kickoff time') as HTMLInputElement).value,
    ).toBe('09:30');
    expect(
      (screen.getByLabelText('End of demo day') as HTMLInputElement).value,
    ).toBe('17:00');
    expect(
      screen.getByText('Kickoff March 12 · Demo day March 14'),
    ).toBeTruthy();
  });

  it('sets kickoff and demo day from two days on the calendar', () => {
    const { onChange } = renderStep();
    const kickoff = futureMonthDay(10);
    const demoDay = futureMonthDay(12);

    fireEvent.click(screen.getByRole('button', { name: /Next month/i }));
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`${kickoff.getDate()}th`),
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`${demoDay.getDate()}th`),
      }),
    );

    const [startsAt, endsAt] = onChange.mock.lastCall ?? [];
    expect(endsAt - startsAt).toBe(2 * 86_400_000 + 9 * 3_600_000);
  });

  it('reports a time that cannot be read and clears the schedule', () => {
    const { onChange, onError } = renderStep({
      startsAt: Date.UTC(2099, 2, 12, 8, 0),
      endsAt: Date.UTC(2099, 2, 14, 17, 0),
    });

    fireEvent.change(screen.getByLabelText('Kickoff time'), {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenLastCalledWith(null, null);
    expect(onError).toHaveBeenLastCalledWith('invalid_wall_time');
  });

  it('shows the message it is given', () => {
    renderStep({ error: 'That time has passed. Choose a future time.' });

    expect(
      screen.getByText('That time has passed. Choose a future time.'),
    ).toBeTruthy();
  });
});
