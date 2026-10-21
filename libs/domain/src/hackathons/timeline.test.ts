import { describe, expect, it } from 'vitest';

import { HACKATHON_PHASES } from '@founders-coffee/core';

import {
  hackathonTimelineSchema,
  phaseAt,
  type HackathonTimeline,
} from './timeline.js';

const at = (iso: string) => Date.parse(iso);

const FIRST: HackathonTimeline = {
  registrationOpensAt: at('2027-01-04T09:00:00Z'),
  registrationClosesAt: at('2027-01-20T23:00:00Z'),
  kickoffAt: at('2027-01-22T17:00:00Z'),
  submissionDeadlineAt: at('2027-01-29T21:00:00Z'),
  endsAt: at('2027-01-30T19:00:00Z'),
  judgingEndsAt: at('2027-02-06T21:00:00Z'),
};

const failsAt = (timeline: HackathonTimeline): string[] => {
  const parsed = hackathonTimelineSchema.safeParse(timeline);
  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => String(issue.path[0]));
};

describe('hackathonTimelineSchema', () => {
  it('accepts the first hackathon’s dates', () => {
    expect(failsAt(FIRST)).toEqual([]);
  });

  it('lets registration close exactly at kickoff and submissions at the end', () => {
    expect(
      failsAt({
        ...FIRST,
        registrationClosesAt: FIRST.kickoffAt,
        submissionDeadlineAt: FIRST.endsAt,
      }),
    ).toEqual([]);
  });

  it.each([
    [
      'registration closing when it opens',
      { registrationClosesAt: FIRST.registrationOpensAt },
      'registrationClosesAt',
    ],
    [
      'registration closing after kickoff',
      { registrationClosesAt: FIRST.kickoffAt + 1 },
      'kickoffAt',
    ],
    [
      'submissions closing at kickoff',
      { submissionDeadlineAt: FIRST.kickoffAt },
      'submissionDeadlineAt',
    ],
    [
      'the event ending before submissions close',
      { endsAt: FIRST.submissionDeadlineAt - 1 },
      'endsAt',
    ],
    [
      'judging ending when the event ends',
      { judgingEndsAt: FIRST.endsAt },
      'judgingEndsAt',
    ],
  ] as const)('refuses %s', (_case, change, path) => {
    expect(failsAt({ ...FIRST, ...change })).toContain(path);
  });

  it('refuses a missing date and anything that is not a timestamp', () => {
    expect(
      hackathonTimelineSchema.safeParse({ ...FIRST, judgingEndsAt: undefined })
        .success,
    ).toBe(false);
    expect(
      hackathonTimelineSchema.safeParse({ ...FIRST, kickoffAt: 1.5 }).success,
    ).toBe(false);
  });
});

describe('phaseAt', () => {
  it.each([
    [FIRST.registrationOpensAt - 1, 'upcoming'],
    [FIRST.registrationOpensAt, 'registration_open'],
    [FIRST.registrationClosesAt - 1, 'registration_open'],
    [FIRST.registrationClosesAt, 'registration_closed'],
    [FIRST.kickoffAt - 1, 'registration_closed'],
    [FIRST.kickoffAt, 'building'],
    [FIRST.submissionDeadlineAt - 1, 'building'],
    [FIRST.submissionDeadlineAt, 'judging'],
    [FIRST.endsAt, 'judging'],
    [FIRST.judgingEndsAt - 1, 'judging'],
    [FIRST.judgingEndsAt, 'results'],
  ] as const)('at %i is %s', (now, phase) => {
    expect(phaseAt(FIRST, now)).toBe(phase);
  });

  it('skips registration_closed when registration closes at kickoff', () => {
    const tight = { ...FIRST, registrationClosesAt: FIRST.kickoffAt };

    expect(phaseAt(tight, FIRST.kickoffAt - 1)).toBe('registration_open');
    expect(phaseAt(tight, FIRST.kickoffAt)).toBe('building');
  });

  it('only ever answers with a known phase', () => {
    for (const now of Object.values(FIRST))
      expect(HACKATHON_PHASES).toContain(phaseAt(FIRST, now));
  });
});
