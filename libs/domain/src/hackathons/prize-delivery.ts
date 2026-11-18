import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_PRIZE_DELIVERY_STATUSES,
  HACKATHON_PRIZE_NOTE_MAX,
  idSchema,
  ok,
  type HackathonPrizeDeliveryStatus,
  type Result,
} from '@founders-coffee/core';

export const prizeDeliveryViewSchema = z.strictObject({ eventId: idSchema });

export const prizeAssignmentSchema = z.strictObject({
  eventId: idSchema,
  prizeId: idSchema,
  submissionId: idSchema,
});

export const prizeDeliverySchema = z.strictObject({
  eventId: idSchema,
  prizeId: idSchema,
  status: z.enum(HACKATHON_PRIZE_DELIVERY_STATUSES),
  note: z
    .string()
    .trim()
    .max(HACKATHON_PRIZE_NOTE_MAX)
    .nullable()
    .transform((note) => note || null),
});

export type PrizeAssignment = z.infer<typeof prizeAssignmentSchema>;
export type PrizeDelivery = z.infer<typeof prizeDeliverySchema>;

type Moment = {
  readonly isCancelled: boolean;
  readonly isResultsPublished: boolean;
};

const resultsOut = (moment: Moment): Result<true> => {
  if (moment.isCancelled)
    return err(
      new AppError('hackathon_not_editable', 'The hackathon was cancelled'),
    );
  if (!moment.isResultsPublished)
    return err(
      new AppError('results_not_published', 'The results are not out yet'),
    );
  return ok(true);
};

/**
 * Whether an organiser can give a prize to an entry (B-PRZ-02): once the results are out, to an entry
 * in them that was not disqualified, and while the prize is not yet with whoever holds it.
 */
export const decidePrizeAssignment = (
  input: Moment & {
    readonly delivery: HackathonPrizeDeliveryStatus | null;
    readonly entry: { readonly isDisqualified: boolean } | null;
  },
): Result<true> => {
  const moment = resultsOut(input);
  if (!moment.ok) return moment;
  if (input.delivery === 'received')
    return err(new AppError('prize_delivered', 'This prize was received'));
  if (!input.entry || input.entry.isDisqualified)
    return err(
      new AppError('prize_entry_unavailable', 'This entry cannot take a prize'),
    );
  return ok(true);
};

/** Whether an organiser can record a prize's delivery (B-PRZ-02): once it has gone to an entry. */
export const decidePrizeDelivery = (
  input: Moment & { readonly isAwarded: boolean },
): Result<true> => {
  const moment = resultsOut(input);
  if (!moment.ok) return moment;
  return input.isAwarded
    ? ok(true)
    : err(new AppError('prize_not_awarded', 'This prize has no holder yet'));
};
