import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonSchedule as Schedule } from '../api';
import { HackathonSchedule } from './HackathonSchedule';

afterEach(() => cleanup());

const schedule: Schedule = {
  registrationOpensAt: Date.parse('2099-01-01T08:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T17:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T11:00:00Z'),
  endsAt: Date.parse('2099-01-16T17:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T17:00:00Z'),
  phase: 'building',
};

const renderSchedule = (
  changes: Partial<Schedule> = {},
  locale: Locale = 'en',
  isCancelled = false,
) =>
  render(
    <HackathonSchedule
      schedule={{ ...schedule, ...changes }}
      locale={locale}
      timeZone="Africa/Algiers"
      isCancelled={isCancelled}
    />,
  );

const current = () =>
  screen.getAllByRole('listitem').find((item) => item.ariaCurrent === 'step');

describe('HackathonSchedule (B-HKN-17)', () => {
  it('lists every step with its dates in the market’s time zone', () => {
    renderSchedule();

    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeTruthy();
    expect(screen.getByText('Opens Thu, Jan 1, 09:00')).toBeTruthy();
    expect(screen.getByText('Closes Sat, Jan 10, 18:00')).toBeTruthy();
    expect(screen.getByText('Thu, Jan 15, 10:00')).toBeTruthy();
    expect(
      screen.getByText('Submissions close Fri, Jan 16, 12:00'),
    ).toBeTruthy();
    expect(screen.getByText('Demo day ends Fri, Jan 16, 18:00')).toBeTruthy();
    expect(screen.getByText('Judging ends Tue, Jan 20, 18:00')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('marks the current phase and says what comes next', () => {
    renderSchedule();

    const step = current();
    expect(step && within(step).getByText('Building')).toBeTruthy();
    expect(step && within(step).getByText('Now')).toBeTruthy();
    expect(
      screen.getByText(
        'Teams are building. Submissions close Fri, Jan 16, 12:00.',
      ),
    ).toBeTruthy();
  });

  it('marks no step before registration opens, and says when it does', () => {
    renderSchedule({ phase: 'upcoming' });

    expect(current()).toBeUndefined();
    expect(
      screen.getByText('Registration opens Thu, Jan 1, 09:00.'),
    ).toBeTruthy();
  });

  it('waits for kickoff on the kickoff step once registration closes', () => {
    renderSchedule({ phase: 'registration_closed' });

    const step = current();
    expect(step && within(step).getByText('Kickoff')).toBeTruthy();
  });

  it('shows the dates but no phase for a cancelled hackathon', () => {
    renderSchedule({}, 'en', true);

    expect(current()).toBeUndefined();
    expect(screen.queryByText(/^Teams are building/u)).toBeNull();
    expect(screen.getByText('Opens Thu, Jan 1, 09:00')).toBeTruthy();
  });

  it('reads in Arabic and in French', () => {
    renderSchedule({ phase: 'judging' }, 'ar');
    expect(screen.getByRole('heading', { name: 'الجدول الزمني' })).toBeTruthy();
    const step = current();
    expect(step && within(step).getByText('التحكيم')).toBeTruthy();
    expect(screen.getByText(/^أُغلق التسليم/u)).toBeTruthy();
    cleanup();

    renderSchedule({ phase: 'registration_open' }, 'fr');
    expect(
      screen.getByText(
        'Les inscriptions sont ouvertes jusqu’au sam. 10 janv. à 18:00.',
      ),
    ).toBeTruthy();
  });
});
