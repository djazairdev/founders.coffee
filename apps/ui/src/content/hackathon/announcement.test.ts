import { describe, expect, it } from 'vitest';

import { FIRST_HACKATHON, isAnnouncementShown } from './announcement';

const ALGIERS = 'Africa/Algiers';
const at = (iso: string) => new Date(iso).getTime();

describe('the first hackathon announcement', () => {
  it('runs its dates in order, inside one month, as the copy writes them', () => {
    const { registrationOpens, kickoff, submissionsClose, demoDay } =
      FIRST_HACKATHON;
    expect(
      [registrationOpens, kickoff, submissionsClose, demoDay].every(
        (day) => !Number.isNaN(new Date(`${day}T12:00:00Z`).getTime()),
      ),
    ).toBe(true);
    expect(registrationOpens < kickoff).toBe(true);
    expect(kickoff < submissionsClose).toBe(true);
    expect(submissionsClose <= demoDay).toBe(true);
    expect(
      kickoff.slice(0, 7),
      'the heading names one month and one year for the whole week',
    ).toBe(demoDay.slice(0, 7));
  });

  it('shows on the Algerian pages before registration opens', () => {
    expect(
      isAnnouncementShown(
        FIRST_HACKATHON,
        'DZ',
        ALGIERS,
        at('2026-10-21T10:00:00Z'),
      ),
    ).toBe(true);
    expect(
      isAnnouncementShown(
        FIRST_HACKATHON,
        'DZ',
        ALGIERS,
        at('2027-01-03T22:59:59Z'),
      ),
    ).toBe(true);
  });

  it('goes at midnight in Algiers on the day registration opens', () => {
    expect(
      isAnnouncementShown(
        FIRST_HACKATHON,
        'DZ',
        ALGIERS,
        at('2027-01-03T23:00:00Z'),
      ),
    ).toBe(false);
    expect(
      isAnnouncementShown(
        FIRST_HACKATHON,
        'DZ',
        ALGIERS,
        at('2027-01-22T09:00:00Z'),
      ),
    ).toBe(false);
  });

  it('never shows in a market the hackathon does not run in', () => {
    expect(
      isAnnouncementShown(
        FIRST_HACKATHON,
        'EG',
        'Africa/Cairo',
        at('2026-10-21T10:00:00Z'),
      ),
    ).toBe(false);
  });
});
