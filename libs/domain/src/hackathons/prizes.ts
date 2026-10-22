import { z } from 'zod';

import { idSchema, moneySchema } from '@founders-coffee/core';

export const HACKATHON_PRIZE_PLACE_MAX = 10;

export const hackathonPrizeSchema = z.strictObject({
  trackId: idSchema.nullable(),
  place: z.number().int().min(1).max(HACKATHON_PRIZE_PLACE_MAX),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  providerName: z.string().trim().min(2).max(100),
  value: moneySchema
    .extend({ amount_minor: z.number().int().positive() })
    .nullable(),
});

export type HackathonPrizeInput = z.infer<typeof hackathonPrizeSchema>;
