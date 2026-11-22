import { z } from 'zod';

import { idSchema, localeSchema } from '@founders-coffee/core';

export const hackathonDraftEmailSchema = z.strictObject({
  eventId: idSchema,
  template: z.enum(['draft-completion-reminder', 'hackathon-outreach']),
  recipient: z.string().trim().email().max(254),
  locale: localeSchema,
});

export type HackathonDraftEmailInput = z.infer<
  typeof hackathonDraftEmailSchema
>;
