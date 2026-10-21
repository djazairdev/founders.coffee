import { describe, expect, it } from 'vitest';

import { hackathonDraftSchema } from './draft.js';

const DAY = 86_400_000;
const kickoff = Date.now() + 30 * DAY;

const draft = (overrides: Record<string, unknown> = {}) => ({
  marketCode: 'DZ',
  title: 'Algiers Builders Hackathon',
  description: 'Two days of building with founders across Algiers.',
  venueName: 'Sylabs',
  venueAddress: '12 Rue Didouche Mourad, Alger',
  latitude: 36.7538,
  longitude: 3.0588,
  startsAt: kickoff,
  endsAt: kickoff + 2 * DAY,
  languages: ['ar', 'fr'],
  registrationOpensAt: Date.now() + DAY,
  registrationClosesAt: kickoff - DAY,
  submissionDeadlineAt: kickoff + 2 * DAY - 3_600_000,
  judgingEndsAt: kickoff + 9 * DAY,
  attendanceModes: ['in_person'],
  teamMin: 1,
  teamMax: 4,
  aiPolicy: 'disclosed',
  ...overrides,
});

const pathsOf = (input: Record<string, unknown>) =>
  (hackathonDraftSchema.safeParse(input).error?.issues ?? []).map((issue) =>
    issue.path.join('.'),
  );

describe('a hackathon draft (B-HKN-06)', () => {
  it('takes a complete draft, with no topics, format or notes given', () => {
    const parsed = hackathonDraftSchema.parse(draft());

    expect(parsed.format).toBe('in_person');
    expect(parsed.tags).toEqual([]);
    expect(parsed.rules).toBeUndefined();
  });

  it('runs up to fourteen days, as a hackathon, and no longer', () => {
    expect(pathsOf(draft({ endsAt: kickoff + 14 * DAY }))).not.toContain(
      'endsAt',
    );
    expect(
      pathsOf(
        draft({
          endsAt: kickoff + 15 * DAY,
          submissionDeadlineAt: kickoff + 14 * DAY,
          judgingEndsAt: kickoff + 20 * DAY,
        }),
      ),
    ).toContain('endsAt');
  });

  it('assumes no AI policy, dates or team size', () => {
    const paths = pathsOf(
      draft({
        aiPolicy: undefined,
        registrationOpensAt: undefined,
        judgingEndsAt: undefined,
        teamMin: undefined,
        teamMax: undefined,
        attendanceModes: undefined,
      }),
    );

    expect(paths).toEqual(
      expect.arrayContaining([
        'aiPolicy',
        'registrationOpensAt',
        'judgingEndsAt',
        'teamMin',
        'teamMax',
        'attendanceModes',
      ]),
    );
  });

  it('places registration before kickoff and judging after demo day', () => {
    expect(pathsOf(draft({ registrationClosesAt: kickoff + DAY }))).toContain(
      'startsAt',
    );
    expect(
      pathsOf(draft({ registrationClosesAt: Date.now() + DAY / 2 })),
    ).toContain('registrationClosesAt');
    expect(pathsOf(draft({ submissionDeadlineAt: kickoff - DAY }))).toContain(
      'submissionDeadlineAt',
    );
    expect(pathsOf(draft({ judgingEndsAt: kickoff + DAY }))).toContain(
      'judgingEndsAt',
    );
  });

  it('holds the team size to a range within the ceiling', () => {
    expect(pathsOf(draft({ teamMin: 5, teamMax: 3 }))).toContain('teamMax');
    expect(pathsOf(draft({ teamMax: 11 }))).toContain('teamMax');
    expect(pathsOf(draft({ teamMin: 0 }))).toContain('teamMin');
  });

  it('offers only the attendance modes its format allows, each once', () => {
    expect(pathsOf(draft({ attendanceModes: ['online'] }))).toContain(
      'attendanceModes',
    );
    expect(
      pathsOf(draft({ attendanceModes: ['in_person', 'in_person'] })),
    ).toContain('attendanceModes');
    expect(
      pathsOf(
        draft({
          format: 'hybrid',
          meetingUrl: 'https://meet.example.com/abc',
          attendanceModes: ['in_person', 'online'],
        }),
      ),
    ).toEqual([]);
  });

  it('holds the event fields to their own rules: a venue in person, a link online', () => {
    expect(pathsOf(draft({ venueName: undefined }))).toContain('venueName');
    expect(
      pathsOf(
        draft({
          format: 'online',
          cityCode: '556',
          venueName: undefined,
          venueAddress: undefined,
          latitude: undefined,
          longitude: undefined,
          attendanceModes: ['online'],
        }),
      ),
    ).toContain('meetingUrl');
  });

  it('keeps its optional limits sane, and refuses anything it does not know', () => {
    expect(pathsOf(draft({ capacity: 0 }))).toContain('capacity');
    expect(pathsOf(draft({ minimumAge: 120 }))).toContain('minimumAge');
    expect(pathsOf(draft({ aiPolicy: 'anything_goes' }))).toContain('aiPolicy');
    expect(
      hackathonDraftSchema.safeParse(draft({ kind: 'meetup' })).success,
    ).toBe(false);
    expect(
      hackathonDraftSchema.safeParse(draft({ reviewStatus: 'approved' }))
        .success,
    ).toBe(false);
  });
});
