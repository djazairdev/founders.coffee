import { describe, expect, it } from 'vitest';

import {
  HACKATHON_MAX_DAYS,
  resolveHackathonSchedule,
  validateHackathonSchedule,
  wallTime,
} from './hackathon-schedule';

const ALGIERS = 'Africa/Algiers';
const DAY = 86_400_000;
const localDay = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

describe('resolveHackathonSchedule', () => {
  it('reads kickoff and the end of demo day in the market’s time zone', () => {
    const resolved = resolveHackathonSchedule(
      { from: localDay(2099, 3, 12), to: localDay(2099, 3, 14) },
      '09:00',
      '18:00',
      ALGIERS,
    );

    expect(resolved).toEqual({
      ok: true,
      startsAt: Date.UTC(2099, 2, 12, 8, 0),
      endsAt: Date.UTC(2099, 2, 14, 17, 0),
    });
  });

  it('ends a one-day hackathon on the day it starts', () => {
    const resolved = resolveHackathonSchedule(
      { from: localDay(2099, 3, 12) },
      '09:00',
      '21:30',
      ALGIERS,
    );

    expect(resolved).toEqual({
      ok: true,
      startsAt: Date.UTC(2099, 2, 12, 8, 0),
      endsAt: Date.UTC(2099, 2, 12, 20, 30),
    });
  });

  it('has no schedule before a day is picked', () => {
    expect(
      resolveHackathonSchedule(undefined, '09:00', '18:00', ALGIERS),
    ).toEqual({ ok: true, startsAt: null, endsAt: null });
  });

  it('says why a time cannot be read', () => {
    const days = { from: localDay(2099, 3, 12) };

    expect(resolveHackathonSchedule(days, '', '18:00', ALGIERS)).toEqual({
      ok: false,
      reason: 'invalid_wall_time',
    });
    expect(resolveHackathonSchedule(days, '09:00', '', ALGIERS)).toEqual({
      ok: false,
      reason: 'invalid_wall_time',
    });
    expect(
      resolveHackathonSchedule(days, '09:00', '18:00', 'Nowhere/Atlantis'),
    ).toEqual({ ok: false, reason: 'invalid_time_zone' });
  });

  it('shows an instant as the market’s wall clock', () => {
    expect(wallTime(Date.UTC(2099, 2, 12, 8, 5), ALGIERS)).toBe('09:05');
  });
});

describe('validateHackathonSchedule', () => {
  const kickoff = Date.now() + 30 * DAY;

  it('is a gap until both ends are set', () => {
    expect(validateHackathonSchedule(null, null, 'en')).toEqual({
      schedule: null,
    });
  });

  it('takes up to the hackathon’s limit, and no longer', () => {
    expect(
      validateHackathonSchedule(
        kickoff,
        kickoff + HACKATHON_MAX_DAYS * DAY,
        'en',
      ),
    ).toEqual({});
    expect(
      validateHackathonSchedule(
        kickoff,
        kickoff + HACKATHON_MAX_DAYS * DAY + 1,
        'en',
      ),
    ).toEqual({
      schedule: 'Demo day must end after kickoff, at most 14 days later.',
    });
    expect(validateHackathonSchedule(kickoff, kickoff - 1, 'fr')).toEqual({
      schedule:
        'La démo doit se terminer après le lancement, au plus 14 jours plus tard.',
    });
  });

  it('refuses a kickoff already gone', () => {
    expect(
      validateHackathonSchedule(Date.now() - DAY, Date.now() + DAY, 'en'),
    ).toEqual({ schedule: 'That time has passed. Choose a future time.' });
  });
});
