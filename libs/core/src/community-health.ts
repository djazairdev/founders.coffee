import { z } from 'zod';
import { userIdSchema, marketCodeSchema } from './validation.js';

export const communityHealthQuerySchema = z
  .strictObject({
    market: marketCodeSchema,
    operatorHostId: userIdSchema.optional(),
    city: z
      .string()
      .regex(/^[a-z0-9_-]{1,64}$/)
      .optional(),
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
    asOf: z.iso.datetime({ offset: true }),
  })
  .refine((value) => {
    const from = Date.parse(value.from),
      to = Date.parse(value.to),
      asOf = Date.parse(value.asOf);
    return (
      from < to &&
      to <= asOf &&
      to - from <= 366 * 86_400_000 &&
      asOf <= Date.now()
    );
  }, 'Use a past reporting period of at most one year');
export type CommunityHealthQuery = z.infer<typeof communityHealthQuerySchema>;
