import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_MENTOR_HELPS_WITH_MAX,
  HACKATHON_MENTOR_OFFICE_HOURS_MAX,
  idSchema,
  ok,
  type HackathonMentorStatus,
  type Result,
} from '@founders-coffee/core';

import { placeTokenSchema } from './judges.js';
import { canChangePlaces } from './places.js';

export const HACKATHON_MENTOR_HELPS_WITH_MIN = 3;

export const hackathonMentorNoteSchema = z.strictObject({
  helpsWith: z
    .string()
    .trim()
    .min(HACKATHON_MENTOR_HELPS_WITH_MIN)
    .max(HACKATHON_MENTOR_HELPS_WITH_MAX),
  officeHours: z
    .string()
    .trim()
    .max(HACKATHON_MENTOR_OFFICE_HOURS_MAX)
    .transform((text) => (text === '' ? null : text))
    .nullable(),
});

export type HackathonMentorNote = z.infer<typeof hackathonMentorNoteSchema>;

export const hackathonMentorInviteSchema = z.strictObject({
  eventId: idSchema,
});

export const hackathonMentorRemoveSchema = z.strictObject({
  eventId: idSchema,
  mentorId: idSchema,
});

export const hackathonMentorAnswerSchema = z.discriminatedUnion('answer', [
  z.strictObject({
    token: placeTokenSchema,
    answer: z.literal('accept'),
    note: hackathonMentorNoteSchema,
  }),
  z.strictObject({ token: placeTokenSchema, answer: z.literal('decline') }),
]);

export type HackathonMentorAnswerInput = z.infer<
  typeof hackathonMentorAnswerSchema
>;

export const hackathonMentorNoteSaveSchema = z.strictObject({
  eventId: idSchema,
  note: hackathonMentorNoteSchema,
});

/**
 * Decide whether a mentor can change what they help with and their office hours (B-HKN-25): only
 * an accepted mentor, while places can still change.
 */
export const decideMentorNote = (
  input: Parameters<typeof canChangePlaces>[0] & {
    readonly heldPlace: HackathonMentorStatus | null;
  },
): Result<true> => {
  if (input.heldPlace !== 'accepted')
    return err(new AppError('not_mentor', 'You do not mentor this hackathon'));
  const changeable = canChangePlaces(input);
  return changeable.ok ? ok(true) : changeable;
};
