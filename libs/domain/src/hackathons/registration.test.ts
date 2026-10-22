import { describe, expect, it } from 'vitest';

import {
  decideRegistration,
  hackathonRegistrationSchema,
  isAttendanceModeOffered,
  type RegistrationRequest,
} from './registration.js';
import type { HackathonTimeline } from './timeline.js';

const HOUR = 3_600_000;
const timeline: HackathonTimeline = {
  registrationOpensAt: 100 * HOUR,
  registrationClosesAt: 200 * HOUR,
  kickoffAt: 210 * HOUR,
  submissionDeadlineAt: 300 * HOUR,
  endsAt: 310 * HOUR,
  judgingEndsAt: 400 * HOUR,
};

const request = (
  overrides: Partial<RegistrationRequest> = {},
): RegistrationRequest => ({
  timeline,
  format: 'online',
  attendanceMode: 'online',
  minimumAge: null,
  isAgeAttested: false,
  capacity: 100,
  registeredCount: 0,
  now: 150 * HOUR,
  ...overrides,
});

const codeOf = (overrides: Partial<RegistrationRequest>) => {
  const result = decideRegistration(request(overrides));
  return result.ok ? null : result.error.code;
};

describe('registering for a hackathon', () => {
  it('registers a participant while registration is open and seats are left', () => {
    expect(decideRegistration(request())).toEqual({
      ok: true,
      data: 'registered',
    });
  });

  it.each([
    ['before it opens', 100 * HOUR - 1],
    ['the moment it closes', 200 * HOUR],
    ['during the build', 250 * HOUR],
    ['after the results', 500 * HOUR],
  ])('refuses %s', (_moment, now) => {
    expect(codeOf({ now })).toBe('registration_closed');
  });

  it('takes a registration at the moment it opens', () => {
    expect(codeOf({ now: 100 * HOUR })).toBeNull();
  });

  it.each([
    ['in_person', 'in_person', true],
    ['in_person', 'online', false],
    ['online', 'online', true],
    ['online', 'in_person', false],
    ['hybrid', 'in_person', true],
    ['hybrid', 'online', true],
  ] as const)(
    'offers a %s hackathon to someone attending %s: %s',
    (format, mode, isOffered) => {
      expect(isAttendanceModeOffered(format, mode)).toBe(isOffered);
      expect(codeOf({ format, attendanceMode: mode })).toBe(
        isOffered ? null : 'attendance_mode_unavailable',
      );
    },
  );

  it('asks for the age to be attested only where the organiser sets a minimum', () => {
    expect(codeOf({ minimumAge: 18, isAgeAttested: false })).toBe(
      'not_eligible',
    );
    expect(codeOf({ minimumAge: 18, isAgeAttested: true })).toBeNull();
    expect(codeOf({ minimumAge: null, isAgeAttested: false })).toBeNull();
  });

  it('puts a participant on the waitlist once every seat is taken, and never refuses for capacity', () => {
    expect(decideRegistration(request({ registeredCount: 99 }))).toEqual({
      ok: true,
      data: 'registered',
    });
    expect(decideRegistration(request({ registeredCount: 100 }))).toEqual({
      ok: true,
      data: 'waitlisted',
    });
    expect(decideRegistration(request({ registeredCount: 140 }))).toEqual({
      ok: true,
      data: 'waitlisted',
    });
  });

  it('never fills a hackathon with no capacity set', () => {
    expect(
      decideRegistration(request({ capacity: null, registeredCount: 10_000 })),
    ).toEqual({ ok: true, data: 'registered' });
  });

  it('reports a closed registration before anything the participant could change', () => {
    expect(
      codeOf({
        now: 500 * HOUR,
        format: 'in_person',
        attendanceMode: 'online',
        minimumAge: 18,
      }),
    ).toBe('registration_closed');
    expect(
      codeOf({ format: 'in_person', attendanceMode: 'online', minimumAge: 18 }),
    ).toBe('attendance_mode_unavailable');
  });
});

describe('the registration request (B-REG-03)', () => {
  const request = {
    eventId: `evt_${'a'.repeat(32)}`,
    attendanceMode: 'online',
    acceptsCodeOfConduct: true,
  };

  it('takes the code of conduct accepted, and nothing else assumed', () => {
    expect(hackathonRegistrationSchema.parse(request)).toEqual({
      ...request,
      isAgeAttested: false,
      isLookingForTeam: false,
      skills: null,
    });
  });

  it('keeps one trimmed line of skills, and reads an empty one as none', () => {
    const parse = (skills: string) =>
      hackathonRegistrationSchema.parse({ ...request, skills }).skills;
    expect(parse('  Go, Postgres ')).toBe('Go, Postgres');
    expect(parse('   ')).toBeNull();
    expect(
      hackathonRegistrationSchema.safeParse({
        ...request,
        skills: 'x'.repeat(141),
      }).success,
    ).toBe(false);
  });

  it('refuses a request without the code of conduct, or with fields it does not know', () => {
    const accepts = (input: object) =>
      hackathonRegistrationSchema.safeParse(input).success;
    expect(accepts({ ...request, acceptsCodeOfConduct: false })).toBe(false);
    expect(accepts({ ...request, acceptsCodeOfConduct: undefined })).toBe(
      false,
    );
    expect(accepts({ ...request, status: 'registered' })).toBe(false);
    expect(accepts({ ...request, eventId: 'evt-1' })).toBe(false);
  });
});
