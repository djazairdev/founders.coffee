import { z } from 'zod';

import { idSchema } from '@founders-coffee/core';

import { HACKATHON_PLACE_LIMIT } from './places.js';

export const HACKATHON_JUDGE_LIMIT = HACKATHON_PLACE_LIMIT;

export const placeTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const hackathonJudgeInviteSchema = z.strictObject({ eventId: idSchema });

export const hackathonJudgeRemoveSchema = z.strictObject({
  eventId: idSchema,
  judgeId: idSchema,
});

export const hackathonJudgeAnswerSchema = z.strictObject({
  token: placeTokenSchema,
  answer: z.enum(['accept', 'decline']),
});

export type HackathonJudgeAnswerInput = z.infer<
  typeof hackathonJudgeAnswerSchema
>;
