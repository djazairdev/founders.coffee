import { z } from 'zod';

import {
  addEventCreateIssues,
  EVENT_CREATE_FIELDS,
  EVENT_DESCRIPTION_STORAGE_MAX_LENGTH,
  eventDescriptionStorageSchema,
  hackathonFieldsSchema,
  hackathonTypeTagsSchema,
} from '../events/schemas.js';

export const HACKATHON_DESCRIPTION_MAX_LENGTH =
  EVENT_DESCRIPTION_STORAGE_MAX_LENGTH;
export const hackathonDescriptionSchema = eventDescriptionStorageSchema;
export const HACKATHON_EVENT_FIELDS = {
  ...EVENT_CREATE_FIELDS,
  description: hackathonDescriptionSchema,
  hackathonFields: hackathonFieldsSchema.refine(
    (fields) => fields.length > 0,
    'At least one hackathon field is required',
  ),
  hackathonTypeTags: hackathonTypeTagsSchema.refine(
    (tags) => tags.length > 0,
    'At least one hackathon type tag is required',
  ),
};

/**
 * Hold a hackathon's first step, the event it is (B-HKN-11), to every new event's rules for the
 * hackathon's own type: its venue or optional online link for its format, and kickoff to demo day, which
 * may run up to fourteen days. The draft is saved from this alone; the rules, eligibility, AI policy
 * and timeline around it are the next step's, so none of them is assumed here.
 */
const addBasicsIssues = (
  input: z.infer<typeof hackathonBasicsShape>,
  context: z.RefinementCtx,
): void => addEventCreateIssues({ ...input, kind: 'hackathon' }, context);

const hackathonBasicsShape = z.object(HACKATHON_EVENT_FIELDS).strict();

export const hackathonBasicsSchema =
  hackathonBasicsShape.superRefine(addBasicsIssues);

export type HackathonBasics = z.infer<typeof hackathonBasicsSchema>;
