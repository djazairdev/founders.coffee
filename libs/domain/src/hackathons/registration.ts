import { z } from 'zod';

import {
  AppError,
  ATTENDANCE_MODES_BY_FORMAT,
  attendanceModeSchema,
  err,
  HACKATHON_REGISTRATION_SKILLS_MAX,
  idSchema,
  ok,
  type AttendanceMode,
  type EventFormat,
  type RegistrationStatus,
  type Result,
} from '@founders-coffee/core';

import { phaseAt, type HackathonTimeline } from './timeline.js';

export type RegistrationRequest = {
  readonly timeline: HackathonTimeline;
  readonly format: EventFormat;
  readonly attendanceMode: AttendanceMode;
  readonly minimumAge: number | null;
  readonly isAgeAttested: boolean;
  readonly capacity: number | null;
  readonly registeredCount: number;
  readonly now: number;
};

export const hackathonRegistrationSchema = z.strictObject({
  eventId: idSchema,
  attendanceMode: attendanceModeSchema,
  acceptsCodeOfConduct: z.literal(true),
  isAgeAttested: z.boolean().default(false),
  isLookingForTeam: z.boolean().default(false),
  skills: z
    .string()
    .trim()
    .max(HACKATHON_REGISTRATION_SKILLS_MAX)
    .transform((value) => value || null)
    .nullable()
    .default(null),
});

export type HackathonRegistrationInput = z.input<
  typeof hackathonRegistrationSchema
>;

/** Whether a hackathon of this format can be attended this way. */
export const isAttendanceModeOffered = (
  format: EventFormat,
  mode: AttendanceMode,
): boolean => ATTENDANCE_MODES_BY_FORMAT[format].includes(mode);

/**
 * Decide a registration from the hackathon's rules, or refuse it with a typed error.
 *
 * The checks run in the order a participant can act on them. Registration is taken only while its
 * phase is open, so the dates alone say when it closes. The way they attend has to be one the format
 * offers: in person for an in-person hackathon, online for an online one, either for a hybrid one.
 * Where the organiser sets a minimum age, the participant attests to it; nothing else about their
 * age is asked or kept. A full hackathon still takes the registration, on the waitlist, so capacity
 * never refuses anyone. A capacity of `null` means no limit.
 */
export const decideRegistration = (
  request: RegistrationRequest,
): Result<RegistrationStatus> => {
  if (phaseAt(request.timeline, request.now) !== 'registration_open')
    return err(new AppError('registration_closed', 'Registration is not open'));
  if (!isAttendanceModeOffered(request.format, request.attendanceMode))
    return err(
      new AppError(
        'attendance_mode_unavailable',
        `A ${request.format} hackathon cannot be attended ${request.attendanceMode}`,
      ),
    );
  if (request.minimumAge !== null && !request.isAgeAttested)
    return err(
      new AppError(
        'not_eligible',
        `Participants must attest they are at least ${request.minimumAge}`,
      ),
    );
  const isFull =
    request.capacity !== null && request.registeredCount >= request.capacity;
  return ok(isFull ? 'waitlisted' : 'registered');
};
