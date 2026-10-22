import { describe, expect, it } from 'vitest';

import { hackathonDetailsFor, hackathonDetailsSchema } from './draft.js';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const kickoff = Date.now() + 30 * DAY;
const event = {
  startsAt: kickoff,
  endsAt: kickoff + 2 * DAY,
  format: 'in_person' as const,
};

const details = (overrides: Record<string, unknown> = {}) => ({
  registrationOpensAt: Date.now() + DAY,
  registrationClosesAt: kickoff - DAY,
  submissionDeadlineAt: kickoff + 2 * DAY - HOUR,
  judgingEndsAt: kickoff + 9 * DAY,
  attendanceModes: ['in_person'],
  teamMin: 1,
  teamMax: 4,
  aiPolicy: 'disclosed',
  ...overrides,
});

const pathsOf = (
  input: Record<string, unknown>,
  frame: Parameters<typeof hackathonDetailsFor>[0] = event,
) =>
  (hackathonDetailsFor(frame).safeParse(input).error?.issues ?? []).map(
    (issue) => issue.path.join('.'),
  );

describe("a hackathon's details, held to its saved event (B-HKN-12)", () => {
  it('takes details that fit the event, with every optional value left out', () => {
    expect(pathsOf(details())).toEqual([]);
  });

  it('places registration before kickoff and submissions within the event', () => {
    expect(pathsOf(details({ registrationClosesAt: kickoff + HOUR }))).toEqual([
      'startsAt',
    ]);
    expect(
      pathsOf(details({ submissionDeadlineAt: kickoff + 2 * DAY + HOUR })),
    ).toEqual(['endsAt']);
    expect(pathsOf(details({ judgingEndsAt: kickoff + DAY }))).toContain(
      'judgingEndsAt',
    );
  });

  it('offers only the attendance the format has, each once', () => {
    const hybrid = { ...event, format: 'hybrid' as const };
    expect(
      pathsOf(details({ attendanceModes: ['in_person', 'online'] }), hybrid),
    ).toEqual([]);
    expect(pathsOf(details({ attendanceModes: ['online'] }), event)).toEqual([
      'attendanceModes',
    ]);
    expect(
      pathsOf(details({ attendanceModes: ['online', 'online'] }), hybrid),
    ).toEqual(['attendanceModes']);
  });

  it('keeps the largest team no smaller than the smallest', () => {
    expect(pathsOf(details({ teamMin: 4, teamMax: 2 }))).toEqual(['teamMax']);
  });

  it('checks the shape alone without an event, and refuses the event’s own fields', () => {
    expect(hackathonDetailsSchema.safeParse(details()).success).toBe(true);
    expect(
      hackathonDetailsSchema.safeParse(details({ title: 'A hackathon' }))
        .success,
    ).toBe(false);
  });
});
